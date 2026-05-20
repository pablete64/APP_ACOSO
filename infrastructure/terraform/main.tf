# ============================================================
# SafeWork AI — Infraestructura AWS Frankfurt (eu-central-1)
# Cloud europeo · ISO 27001 · GDPR art. 44-49
# ============================================================

terraform {
  required_version = ">= 1.7"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket         = "safework-tfstate-eu"
    key            = "production/terraform.tfstate"
    region         = "eu-central-1"
    encrypt        = true
    dynamodb_table = "safework-tfstate-lock"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "SafeWork AI"
      Environment = var.environment
      Owner       = "REKER Tech Solutions SL"
      GDPR        = "true"
    }
  }
}

# ── Variables ─────────────────────────────────────────────────────────────────

variable "aws_region"   { default = "eu-central-1" }  # Frankfurt
variable "environment"  { default = "production" }
variable "db_password"  { sensitive = true }
variable "domain_name"  { default = "safework.es" }

locals {
  name_prefix = "safework-${var.environment}"
  az_a        = "${var.aws_region}a"
  az_b        = "${var.aws_region}b"
}

# ── VPC ───────────────────────────────────────────────────────────────────────

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = { Name = "${local.name_prefix}-vpc" }
}

resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = local.az_a
  tags = { Name = "${local.name_prefix}-private-a", Tier = "private" }
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = local.az_b
  tags = { Name = "${local.name_prefix}-private-b", Tier = "private" }
}

resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.10.0/24"
  availability_zone       = local.az_a
  map_public_ip_on_launch = false
  tags = { Name = "${local.name_prefix}-public-a", Tier = "public" }
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.11.0/24"
  availability_zone       = local.az_b
  map_public_ip_on_launch = false
  tags = { Name = "${local.name_prefix}-public-b", Tier = "public" }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags = { Name = "${local.name_prefix}-igw" }
}

resource "aws_eip" "nat" { domain = "vpc" }

resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public_a.id
  tags = { Name = "${local.name_prefix}-nat" }
}

# ── RDS PostgreSQL Multi-AZ ───────────────────────────────────────────────────

resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnet"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]
}

resource "aws_db_instance" "postgres" {
  identifier              = "${local.name_prefix}-postgres"
  engine                  = "postgres"
  engine_version          = "16.2"
  instance_class          = "db.t4g.medium"
  allocated_storage       = 100
  max_allocated_storage   = 1000
  storage_type            = "gp3"
  storage_encrypted       = true           # Cifrado en reposo obligatorio (RGPD)
  kms_key_id              = aws_kms_key.rds.arn

  db_name  = "safework_db"
  username = "safework"
  password = var.db_password

  multi_az               = true            # Alta disponibilidad
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period    = 30          # 30 días de backups PITR
  backup_window              = "03:00-04:00"
  maintenance_window         = "mon:04:00-mon:05:00"
  deletion_protection        = true
  skip_final_snapshot        = false
  final_snapshot_identifier  = "${local.name_prefix}-final-snapshot"
  copy_tags_to_snapshot      = true

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = { Name = "${local.name_prefix}-postgres" }
}

# ── ElastiCache Redis ─────────────────────────────────────────────────────────

resource "aws_elasticache_subnet_group" "main" {
  name       = "${local.name_prefix}-redis-subnet"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "${local.name_prefix}-redis"
  description          = "SafeWork AI session store and rate limiter"
  node_type            = "cache.t4g.small"
  num_cache_clusters   = 2
  automatic_failover_enabled = true
  multi_az_enabled     = true
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]
  maintenance_window   = "tue:05:00-tue:06:00"
  snapshot_retention_limit = 7

  tags = { Name = "${local.name_prefix}-redis" }
}

# ── S3 — Evidencias cifradas ──────────────────────────────────────────────────

resource "aws_s3_bucket" "evidencias" {
  bucket        = "${local.name_prefix}-evidencias-${data.aws_caller_identity.current.account_id}"
  force_destroy = false

  tags = { Name = "${local.name_prefix}-evidencias", DataClass = "confidential" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "evidencias" {
  bucket = aws_s3_bucket.evidencias.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_versioning" "evidencias" {
  bucket = aws_s3_bucket.evidencias.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_public_access_block" "evidencias" {
  bucket                  = aws_s3_bucket.evidencias.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "evidencias" {
  bucket = aws_s3_bucket.evidencias.id
  rule {
    id     = "transition-to-glacier"
    status = "Enabled"
    filter { prefix = "" }
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
  }
}

# ── KMS ───────────────────────────────────────────────────────────────────────

resource "aws_kms_key" "rds" {
  description             = "SafeWork AI RDS encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  tags = { Name = "${local.name_prefix}-rds-key" }
}

resource "aws_kms_key" "s3" {
  description             = "SafeWork AI S3 encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  tags = { Name = "${local.name_prefix}-s3-key" }
}

# ── Security Groups ───────────────────────────────────────────────────────────

resource "aws_security_group" "rds" {
  name   = "${local.name_prefix}-rds-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "PostgreSQL desde app tier"
  }
  egress { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] }
}

resource "aws_security_group" "redis" {
  name   = "${local.name_prefix}-redis-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "Redis desde app tier"
  }
  egress { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] }
}

resource "aws_security_group" "app" {
  name   = "${local.name_prefix}-app-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS público"
  }
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP → redirect a HTTPS"
  }
  egress { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] }
}

# ── Data sources ──────────────────────────────────────────────────────────────

data "aws_caller_identity" "current" {}

# ── Outputs ───────────────────────────────────────────────────────────────────

output "rds_endpoint"   { value = aws_db_instance.postgres.endpoint }
output "redis_endpoint" { value = aws_elasticache_replication_group.redis.primary_endpoint_address }
output "s3_bucket"      { value = aws_s3_bucket.evidencias.bucket }
