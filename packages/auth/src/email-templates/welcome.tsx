import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Link,
  Hr,
} from "@react-email/components";

interface WelcomeEmailProps {
  username: string;
  baseUrl?: string;
}

export const WelcomeEmail = ({ username, baseUrl = "https://example.com" }: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to {new URL(baseUrl).hostname}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome, {username}!</Heading>
        <Text style={text}>
          We are thrilled to have you on board. Your account has been created
          successfully.
        </Text>
        <Section style={section}>
          <Text style={text}>
            Get started by exploring your dashboard and setting up your profile.
          </Text>
          <Link href={baseUrl} style={button}>
            Go to Dashboard
          </Link>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          If you did not create this account, please ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  padding: "40px 0",
};

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #e6e6e6",
  borderRadius: "8px",
  margin: "0 auto",
  maxWidth: "600px",
  padding: "40px 20px",
};

const h1 = {
  color: "#1e1e1e",
  fontSize: "28px",
  fontWeight: "700",
  lineHeight: "1.3",
  margin: "0 0 20px",
  textAlign: "center" as const,
};

const text = {
  color: "#555555",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 16px",
};

const section = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const button = {
  backgroundColor: "#5469d4",
  borderRadius: "4px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: "600",
  padding: "12px 24px",
  textDecoration: "none",
};

const hr = {
  borderColor: "#e6e6e6",
  margin: "24px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "14px",
  lineHeight: "1.4",
  margin: "0",
};

export default WelcomeEmail;
