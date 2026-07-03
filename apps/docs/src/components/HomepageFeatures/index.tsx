import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  icon: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Clean Architecture',
    icon: '🏗️',
    description: (
      <>
        Domain → Application → Infrastructure → NestJS. Zero coupling between layers.
        Easy to test, extend, and maintain.
      </>
    ),
  },
  {
    title: 'Keycloak as Source of Truth',
    icon: '🔐',
    description: (
      <>
        Keycloak handles identity: registration, login, password reset, 2FA.
        Your app owns the profile and token storage.
      </>
    ),
  },
  {
    title: 'Production Ready',
    icon: '🚀',
    description: (
      <>
        266+ unit tests, 16 E2E tests, JWT (HS256), httpOnly cookies, TOTP 2FA,
        rate limiting, input validation, and security hardening guides.
      </>
    ),
  },
  {
    title: 'Pluggable Storage',
    icon: '💾',
    description: (
      <>
        Switch between InMemory, Prisma, TypeORM, or Redis token stores via
        the <code>ITokenStore</code> interface.
      </>
    ),
  },
  {
    title: 'Email Templates',
    icon: '📧',
    description: (
      <>
        React Email templates for password reset and magic link emails.
        Customizable and type-safe.
      </>
    ),
  },
  {
    title: 'CLI Tooling',
    icon: '⚙️',
    description: (
      <>
        <code>auth-cli</code> to generate Keycloak realm configuration,
        export users, and import data.
      </>
    ),
  },
  {
    title: 'Event-Driven',
    icon: '📡',
    description: (
      <>
        Extend behavior via <code>AuthEventBus</code> with 7 lifecycle events:
        registered, logged in, token refreshed, password reset, and more.
      </>
    ),
  },
  {
    title: '2FA Ready',
    icon: '🛡️',
    description: (
      <>
        TOTP two-factor authentication with QR code setup and verification.
        Secret stored in your token store, not in Keycloak.
      </>
    ),
  },
  {
    title: 'Rate Limiting',
    icon: '⏱️',
    description: (
      <>
        Optional <code>@nestjs/throttler</code> integration for brute-force
        protection on sensitive endpoints.
      </>
    ),
  },
];

function Feature({title, icon, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <div className={styles.featureIcon}>{icon}</div>
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
