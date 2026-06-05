// Import project styles so stories render with the real app look
import "../styles/login.css";
import "../styles/app.css";

/** @type { import('storybook').Preview } */
const preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      values: [
        { name: "App (claro)", value: "#f5f6fa" },
        { name: "App (oscuro)", value: "#1a1a2e" },
        { name: "Blanco", value: "#ffffff" },
      ],
    },
  },
};

export default preview;
