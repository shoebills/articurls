import type { ThemeDefinition } from "@/components/themes/registry";
import { StandardHomeLayout } from "./home-layout";
import { StandardPostLayout } from "./post-layout";
import { StandardPageLayout } from "./page-layout";
import { StandardCategoryLayout } from "./category-layout";
import { StandardAuthorLayout } from "./author-layout";
import { StandardCategoriesHubLayout } from "./categories-hub-layout";

export const standardTheme: ThemeDefinition = {
  id: "standard",
  label: "Standard",
  layouts: {
    home: StandardHomeLayout,
    post: StandardPostLayout,
    page: StandardPageLayout,
    category: StandardCategoryLayout,
    author: StandardAuthorLayout,
    categoriesHub: StandardCategoriesHubLayout,
  },
};