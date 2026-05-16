/** Server-side default; placeholders replaced when the email is sent. */
export const WELCOME_EMAIL_SUBJECT_TEMPLATE = "Welcome to {{ blog_name }}'s blog";

export function welcomeEmailSubjectDisplay(blogName: string): string {
  const name = blogName.trim() || "My Blog";
  return `Welcome to ${name}'s blog`;
}

export function isStoredWelcomeSubjectDefault(
  stored: string | null | undefined,
  blogName: string
): boolean {
  const trimmed = stored?.trim();
  if (!trimmed) return true;
  if (trimmed === WELCOME_EMAIL_SUBJECT_TEMPLATE) return true;
  return trimmed === welcomeEmailSubjectDisplay(blogName);
}

/** Default welcome email body shown in the editor (shell applied on send). */
export const WELCOME_EMAIL_STARTER_HTML = `<h2>Welcome!</h2>
<p>Thanks for confirming your subscription to <strong>{{ blog_name }}</strong>. You'll get notified when new posts are published.</p>
<p data-email-button-wrap="true"><a data-email-button="true" href="{{ blog_url }}">Visit the blog</a></p>`;
