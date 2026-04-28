import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import {
  clearAll,
  getNotifs,
  markAllRead,
  requestNotifPermission,
  StoredNotif,
  unreadCount,
} from "@/lib/notifications";

export function NotificationsBell() {
  const { user } = useAuth();
  const [list, setList] = useState<StoredNotif[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    const refresh = () => {
      setList(getNotifs(user.id));
      setUnread(unreadCount(user.id));
    };
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener("notifs:update", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("notifs:update", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [user]);

  useEffect(() => {
    if (user) requestNotifPermission();
  }, [user]);

  if (!user) return null;

  return (
    <Popover
      onOpenChange={(o) => {
        if (!o && user) {
          markAllRead(user.id);
          setUnread(0);
          window.dispatchEvent(new CustomEvent("notifs:update"));
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground grid place-items-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-medium text-sm">Notifications</div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                markAllRead(user.id);
                setList(getNotifs(user.id));
                setUnread(0);
              }}
              title="Mark all read"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                clearAll(user.id);
                setList([]);
                setUnread(0);
              }}
              title="Clear all"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="max-h-80 overflow-auto">
          {list.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet</div>
          ) : (
            list.map((n) => {
              const inner = (
                <div className={`p-3 border-b last:border-0 hover:bg-muted/50 ${!n.read ? "bg-muted/30" : ""}`}>
                  <div className="text-sm font-medium">{n.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
              );
              return n.url ? (
                <Link key={n.id} to={n.url}>{inner}</Link>
              ) : (
                <div key={n.id}>{inner}</div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
