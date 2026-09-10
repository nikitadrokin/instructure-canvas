import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuGroup,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@/components/ui/menu";

export function ModeToggle() {
  const { setTheme } = useTheme();

  return (
    <Menu>
      <MenuTrigger render={<Button variant="outline" size="icon" />}>
        <Sun className="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
        <Moon className="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
        <span className="sr-only">Toggle theme</span>
      </MenuTrigger>
      <MenuPopup align="end">
        <MenuGroup>
          <MenuItem closeOnClick onClick={() => setTheme("light")}>
            Light
          </MenuItem>
          <MenuItem closeOnClick onClick={() => setTheme("dark")}>
            Dark
          </MenuItem>
          <MenuItem closeOnClick onClick={() => setTheme("system")}>
            System
          </MenuItem>
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}
