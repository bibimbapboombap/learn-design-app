// The shape of the learning plan, whether it comes from Notion or the sample.
//
// Task ids are what completions are stored against. For Notion content they
// are block ids, which stay the same when a task is renamed or moved.

export type Resource = {
  title: string;
  url: string;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  resources: Resource[];
};

export type Section = {
  id: string;
  title: string;
  description?: string;
  tasks: Task[];
};
