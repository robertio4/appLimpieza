"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ComponentProps, MouseEvent } from "react";

type ViewTransitionLinkProps = ComponentProps<typeof Link>;

export function ViewTransitionLink({
  href,
  onClick,
  children,
  ...props
}: ViewTransitionLinkProps) {
  const router = useRouter();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick(e);
    }

    if (e.defaultPrevented) {
      return;
    }

    // Solo aplicar View Transition para navegación interna
    // en clics simples con botón izquierdo, sin modificadores
    // y sin atributos especiales como target o download.
    const isInternalLink = typeof href === "string" && href.startsWith("/");
    const isLeftClick = e.button === 0;
    const hasModifier = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
    const hasSpecialTarget = props.target && props.target !== "_self";
    const hasDownload = props.download;

    if (isInternalLink && isLeftClick && !hasModifier && !hasSpecialTarget && !hasDownload) {
      e.preventDefault();

      const navigate = () => {
        if (props.replace) {
          router.replace(href, { scroll: props.scroll });
        } else {
          router.push(href, { scroll: props.scroll });
        }
      };

      if (document.startViewTransition) {
        document.startViewTransition(navigate);
      } else {
        navigate();
      }
    }
  };

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
