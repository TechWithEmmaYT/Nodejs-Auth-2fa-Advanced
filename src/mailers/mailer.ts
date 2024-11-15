import { config } from "../config/app.config";
import { resend } from "./resendClient";

type Params = {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  from?: string;
};

const mailer_sender = `no-reply <${
  config.NODE_ENV === "development"
    ? "onboarding@resend.dev"
    : config.MAILER_SENDER
}>`;

const mailer_receiver =
  config.NODE_ENV === "development" ? "delivered@resend.dev" : "";

export const sendEmail = async ({
  to = mailer_receiver,
  subject,
  text,
  html,
  from = mailer_sender,
}: Params) =>
  await resend.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    text,
    subject,
    html,
  });
