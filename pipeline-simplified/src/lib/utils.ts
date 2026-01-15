import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPrompt(): string {
  return `These are existing design system styles and files. Please utilize them alongside base components to build. 

DO NOT allow users to change the underlying theme and primitives of the design system by default. If a user deliberately asks to change the design system, warn the user and only proceed upon acknowledgement.
`;
}

export function buildV0Url(registryUrl: string, title?: string, prompt?: string) {
  const params = new URLSearchParams();
  params.append("url", registryUrl);

  if (title != null) {
    params.append("title", title);
  }

  if (prompt != null) {
    params.append("prompt", prompt);
  }

  return `https://v0.dev/chat/api/open?${params.toString()}`;
}

export function buildLovableUrl(registryUrl: string, title?: string, prompt?: string) {
  const params = new URLSearchParams();
  params.append("url", registryUrl);

  if (prompt != null) {
    params.append("prompt", `${prompt} Install the shadcn registry from ${registryUrl}`);
  }

  return `https://lovable.dev/?autosubmit=true#?${params.toString()}`;
}

export function buildCursorUrl(registryUrl: string, title?: string, prompt?: string) {
  const params = new URLSearchParams();

  if (prompt != null) {
    params.append("text", `${prompt} install the shadcn registry from ${registryUrl}`);
  }

  if (title != null) {
    params.append("title", title);
  }


  console.log(params.toString());
  return `cursor://anysphere.cursor-deeplink/prompt?${params.toString()}`;
}