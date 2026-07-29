import type { ReactNode } from "react";
import { Link as LinkIcon } from "lucide-react";
import {
  SiFacebook,
  SiGithub,
  SiInstagram,
  SiPinterest,
  SiYoutube,
  SiX,
} from "react-icons/si";
import { MdOutlineEmail } from "react-icons/md";
import { FaLinkedinIn } from "react-icons/fa6";

export type SocialPlatform =
  | "website_link"
  | "contact_email"
  | "instagram_link"
  | "x_link"
  | "pinterest_link"
  | "facebook_link"
  | "linkedin_link"
  | "github_link"
  | "youtube_link";

export type DesignSectionId = "header" | "body" | "footer";

export const SOCIAL_OPTIONS: Array<{
  key: SocialPlatform;
  label: string;
  icon: ReactNode;
  placeholder: string;
}> = [
  { key: "website_link", label: "Website", icon: <LinkIcon className="h-4 w-4" aria-hidden />, placeholder: "https://yoursite.com" },
  { key: "contact_email", label: "Contact email", icon: <MdOutlineEmail className="h-4 w-4" aria-hidden />, placeholder: "hello@example.com" },
  { key: "instagram_link", label: "Instagram", icon: <SiInstagram className="h-4 w-4" aria-hidden />, placeholder: "https://instagram.com/username" },
  { key: "x_link", label: "X (Twitter)", icon: <SiX className="h-4 w-4" aria-hidden />, placeholder: "https://x.com/username" },
  { key: "pinterest_link", label: "Pinterest", icon: <SiPinterest className="h-4 w-4" aria-hidden />, placeholder: "https://pinterest.com/username" },
  { key: "facebook_link", label: "Facebook", icon: <SiFacebook className="h-4 w-4" aria-hidden />, placeholder: "https://facebook.com/username" },
  { key: "linkedin_link", label: "LinkedIn", icon: <FaLinkedinIn className="h-4 w-4" aria-hidden />, placeholder: "https://linkedin.com/in/username" },
  { key: "github_link", label: "GitHub", icon: <SiGithub className="h-4 w-4" aria-hidden />, placeholder: "https://github.com/username" },
  { key: "youtube_link", label: "YouTube", icon: <SiYoutube className="h-4 w-4" aria-hidden />, placeholder: "https://youtube.com/@username" },
];
