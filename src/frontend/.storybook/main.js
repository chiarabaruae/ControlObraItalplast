/** @type { import('storybook').StorybookConfig } */
const config = {
  stories: ["../stories/**/*.stories.@(js|mjs)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/html-vite",
    options: {},
  },
  staticDirs: ["../"],
};

export default config;
