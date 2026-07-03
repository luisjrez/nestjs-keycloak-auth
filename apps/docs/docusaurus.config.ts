import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: '@luisjrez/nestjs-keycloak-auth',
  tagline: 'Clean-architecture NestJS authentication module backed by Keycloak',
  favicon: 'img/favicon.png',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  url: 'https://luisjrez.github.io',
  baseUrl: '/nestjs-keycloak-auth/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'luisjrez',
  projectName: 'keycloak-nestjs-authentication-api',

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/luisjrez/nestjs-keycloak-auth/tree/main/apps/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

    themeConfig: {
      image: 'img/social-card.png',
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: '@luisjrez/nestjs-keycloak-auth',
        logo: {
          alt: 'nestjs-keycloak-auth logo',
          src: 'img/logo.svg',
        },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
              href: 'https://github.com/luisjrez/nestjs-keycloak-auth',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/getting-started/installation',
            },
            {
              label: 'Quick Start',
              to: '/docs/getting-started/quick-start',
            },
            {
              label: 'Production Checklist',
              to: '/docs/guides/production-checklist',
            },
          ],
        },
        {
          title: 'API',
          items: [
            {
              label: 'Endpoints',
              to: '/docs/api/endpoints',
            },
            {
              label: 'Configuration',
              to: '/docs/getting-started/configuration',
            },
            {
              label: 'Domain Errors',
              to: '/docs/api/domain-errors',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
          href: 'https://github.com/luisjrez/nestjs-keycloak-auth',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Luis Juarez. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
    mermaid: {
      theme: { light: 'neutral', dark: 'dark' },
    },
  } satisfies Preset.ThemeConfig,
  markdown: {
    mermaid: true,
  },
};

export default config;
