import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faKeyboard,
  faLayerGroup,
  faPen,
  faTabletScreenButton,
} from "@fortawesome/free-solid-svg-icons";

const categoryIconByKind: Record<string, typeof faTabletScreenButton> = {
  ipad: faTabletScreenButton,
  keyboard: faKeyboard,
  pencil: faPen,
  tastatur: faKeyboard,
};

type ComponentCategoryIconProps = {
  category: string;
};

export function ComponentCategoryIcon({ category }: ComponentCategoryIconProps) {
  return (
    <FontAwesomeIcon
      aria-hidden="true"
      className="block h-3.5 w-3.5"
      icon={categoryIconByKind[category.trim().toLowerCase()] ?? faLayerGroup}
    />
  );
}

export const componentCategoryIconClassName =
  "inline-flex h-5 w-5 shrink-0 items-center justify-center text-blue-700";
