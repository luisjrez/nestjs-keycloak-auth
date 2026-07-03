export interface RenderedEmail {
  html: string;
  text: string;
  subject: string;
}

export interface IEmailRenderer {
  render(templateName: string, data: Record<string, string | undefined>): Promise<RenderedEmail>;
}
