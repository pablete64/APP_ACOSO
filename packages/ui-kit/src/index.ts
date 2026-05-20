// Primitivos
export {
  Button, buttonVariants,
  Input,
  Textarea,
  Badge, badgeVariants,
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  Skeleton,
  Spinner,
  Checkbox,
} from "./components/primitivos/index.ts";

export type {
  ButtonProps,
  InputProps,
  TextareaProps,
  BadgeProps,
  SkeletonProps,
  SpinnerProps,
} from "./components/primitivos/index.ts";

// SafeWork AI — componentes de dominio
export {
  AnonimoBadge,
  TrackingCodeDisplay,
  EncryptedFileUpload,
  LegalNotice,
} from "./components/safework/index.ts";

export type {
  AnonimoBadgeProps,
  TrackingCodeDisplayProps,
  EncryptedFileUploadProps,
  EncryptedFile,
  LegalNoticeProps,
  LegalNoticeVariant,
} from "./components/safework/index.ts";

// Utilidades
export { cn } from "./lib/utils.ts";
