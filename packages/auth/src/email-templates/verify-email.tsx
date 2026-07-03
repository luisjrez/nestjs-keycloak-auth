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

interface VerifyEmailProps {
  verifyLink: string;
  username: string;
}

export const VerifyEmail = ({ verifyLink, username }: VerifyEmailProps) => (
  <Html>
    <Head />
    <Preview>Verify your email address</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Verify Your Email</Heading>
        <Text style={text}>Hi {username},</Text>
        <Text style={text}>
          Thank you for creating an account. Please verify your email address
          by clicking the button below.
        </Text>
        <Section style={section}>
          <Link href={verifyLink} style={button}>
            Verify Email
          </Link>
        </Section>
        <Text style={text}>
          This link will expire in 24 hours. If you did not create an account,
          please ignore this email.
        </Text>
        <Hr style={hr} />
        <Text style={text}>
          If the button above does not work, copy and paste this URL into your
          browser:
        </Text>
        <Text style={linkText}>{verifyLink}</Text>
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

const linkText = {
  color: "#5469d4",
  fontSize: "14px",
  lineHeight: "1.4",
  wordBreak: "break-all" as const,
};

const hr = {
  borderColor: "#e6e6e6",
  margin: "24px 0",
};

export default VerifyEmail;
