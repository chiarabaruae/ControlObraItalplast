import type { SessionUser } from "@/context/auth";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function UserAvatar({
  user,
  className,
  fallbackClassName
}: {
  user: SessionUser;
  className?: string;
  fallbackClassName?: string;
}) {
  const hasPhoto = user.avatar?.startsWith("data:image/");
  const emoji = user.avatar?.startsWith("emoji:") ? user.avatar.replace("emoji:", "") : undefined;

  return (
    <Avatar className={className}>
      {hasPhoto && <AvatarImage src={user.avatar} alt={`Avatar de ${user.displayName}`} />}
      <AvatarFallback className={cn("bg-primary text-xs font-bold text-primary-foreground", fallbackClassName)}>
        {emoji ?? initials(user.displayName)}
      </AvatarFallback>
    </Avatar>
  );
}
