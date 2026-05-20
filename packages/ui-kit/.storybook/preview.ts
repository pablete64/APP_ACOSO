import type { Preview } from "@storybook/react";

// Importa los estilos base de SafeWork AI (variables CSS + Tailwind)
import "../../web/src/app/globals.css";

const preview: Preview = {
  parameters: {
    // Fondos para ver componentes en light y dark mode
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "#ffffff" },
        { name: "dark",  value: "#0c0a09" },
        { name: "muted", value: "#fafaf9" },
      ],
    },
    // Accesibilidad: nivel WCAG 2.1 AA obligatorio
    a11y: {
      config: {
        rules: [
          { id: "color-contrast", enabled: true },
          { id: "label",          enabled: true },
          { id: "aria-*",         enabled: true },
        ],
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date:  /Date$/i,
      },
    },
  },
  globalTypes: {
    theme: {
      description: "Tema de la interfaz",
      defaultValue: "light",
      toolbar: {
        title: "Tema",
        icon: "circlehollow",
        items: ["light", "dark"],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
