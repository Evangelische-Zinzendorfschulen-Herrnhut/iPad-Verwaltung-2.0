import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightArrowLeft,
  faListCheck,
  faWarehouse,
  faClipboard,
  faLayerGroup,
  faList,
  faTabletScreenButton,
  faUser,
} from "@fortawesome/free-solid-svg-icons";

type ObjectLinkIconKind = "damage" | "devices" | "mdm" | "person" | "set";

type ObjectLinkIconProps = {
  kind: ObjectLinkIconKind;
};

export const objectIconByKind = {
  damage: faClipboard,
  devices: faLayerGroup,
  mdm: faTabletScreenButton,
  person: faUser,
  set: faList,
} satisfies Record<ObjectLinkIconKind, typeof faList>;

export const navigationIconByKind = {
  ...objectIconByKind,
  assignments: faArrowRightArrowLeft,
  tasks: faListCheck,
  storage: faWarehouse,
};

const colorByKind = {
  damage: "text-emerald-700 hover:text-emerald-900",
  devices: "text-blue-700 hover:text-blue-900",
  mdm: "text-zinc-600 hover:text-zinc-900",
  person: "text-emerald-700 hover:text-emerald-900",
  set: "text-amber-700 hover:text-amber-900",
} satisfies Record<ObjectLinkIconKind, string>;

export function objectLinkIconClassName(kind: ObjectLinkIconKind) {
  return [
    "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
    "align-middle transition hover:scale-105",
    colorByKind[kind],
  ].join(" ");
}

export function ObjectLinkIcon({ kind }: ObjectLinkIconProps) {
  return (
    <FontAwesomeIcon
      aria-hidden="true"
      className="block h-3.5 w-3.5"
      icon={objectIconByKind[kind]}
    />
  );
}
