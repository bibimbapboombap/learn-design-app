// The learning plan shown on the main page.
//
// PLACEHOLDER CONTENT: replace with the real list of tasks and resources.
//
// Rules:
// - Every task `id` must be unique and must never change once people start
//   using the app: completion records are stored against it. Renaming the
//   `title` is fine; changing the `id` resets everyone's progress for that task.
// - Use short kebab-case ids, e.g. "typography-basics".

export type ResourceKind = "article" | "video" | "book" | "course" | "tool" | "template";

export type Resource = {
  title: string;
  url: string;
  kind?: ResourceKind;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  resources?: Resource[];
};

export type Section = {
  id: string;
  title: string;
  description?: string;
  tasks: Task[];
};

export const curriculum: Section[] = [
  {
    id: "foundations",
    title: "Foundations",
    description: "Placeholder section. The real list comes next.",
    tasks: [
      {
        id: "read-design-of-everyday-things",
        title: "Read The Design of Everyday Things",
        description: "Placeholder task with a resource link.",
        resources: [
          {
            title: "The Design of Everyday Things, Don Norman",
            url: "https://www.nngroup.com/books/design-everyday-things-revised/",
            kind: "book",
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
            kind: "article",
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
        description: "Placeholder task without resources.",
      },
    ],
  },
];

export const allTasks: Task[] = curriculum.flatMap((section) => section.tasks);

export function findTask(taskId: string): Task | undefined {
  return allTasks.find((task) => task.id === taskId);
}
