declare module "is-hotkey" {
  type Hotkey = string | readonly string[];
  type KeyboardEventLike = Pick<
    KeyboardEvent,
    "altKey" | "ctrlKey" | "key" | "metaKey" | "shiftKey" | "which"
  >;

  export default function isHotkey(hotkey: Hotkey, event: KeyboardEventLike): boolean;
}
