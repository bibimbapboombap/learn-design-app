import type { Section } from "./types";

// Shown when NOTION_TOKEN / NOTION_PAGE_ID aren't set, so the app runs locally
// without a Notion integration. Mirrors the sample content of the Notion page.
export const sampleCurriculum: Section[] = [
  {
    id: "foundations",
    title: "Foundations",
    description: "Start here. These cover the basics every designer leans on.",
    tasks: [
      {
        id: "read-design-of-everyday-things",
        title: "Read The Design of Everyday Things",
        description: "Focus on the chapters about affordances and feedback.",
        resources: [
          {
            title: "The Design of Everyday Things, Don Norman",
            url: "https://www.nngroup.com/books/design-everyday-things-revised/",
          },
        ],
      },
      {
        id: "typography-basics",
        title: "Learn typography basics",
        resources: [
          {
            title: "Butterick's Practical Typography",
            url: "https://practicaltypography.com/",
          },
        ],
      },
    ],
  },
  {
    id: "practice",
    title: "Practice",
    tasks: [
      {
        id: "redesign-a-screen",
        title: "Redesign one screen of an app you use daily",
        description: "Pick a screen that annoys you and write down why before you start.",
        resources: [],
      },
    ],
  },
];
