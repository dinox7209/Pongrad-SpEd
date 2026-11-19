"use client";

import {
  DEMO_DEVELOPMENT_PLANS,
  DEMO_MEDIA_ASSETS,
  DEMO_PROFILES,
  DEMO_RESOURCE_RECORDS,
  DEMO_STUDENT_LOGS,
  DEMO_STUDENTS,
  DEMO_WEEKLY_TASKS,
} from "@/lib/demo-data";
import {
  MediaAsset,
  Profile,
  ResourceRoomRecord,
  Student,
  StudentDevelopmentPlan,
  StudentLog,
  WeeklyTask,
} from "@/types/database";

const KEYS = {
  profiles: "pongrad_sped_demo_profiles_v2",
  students: "pongrad_sped_demo_students_v2",
  logs: "pongrad_sped_demo_logs_v2",
  media: "pongrad_sped_demo_media_v2",
  tasks: "pongrad_sped_demo_tasks_v2",
  records: "pongrad_sped_demo_records_v2",
  devPlans: "pongrad_sped_demo_dev_plans_v1",
};

function readStore<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStore<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

export function getDemoProfiles(): Profile[] {
  return readStore<Profile[]>(KEYS.profiles, DEMO_PROFILES);
}
export function saveDemoProfiles(profiles: Profile[]): void {
  writeStore(KEYS.profiles, profiles);
}

export function getDemoStudents(): Student[] {
  return readStore<Student[]>(KEYS.students, DEMO_STUDENTS);
}
export function saveDemoStudents(students: Student[]): void {
  writeStore(KEYS.students, students);
}

export function getDemoLogs(): StudentLog[] {
  return readStore<StudentLog[]>(KEYS.logs, DEMO_STUDENT_LOGS);
}
export function saveDemoLogs(logs: StudentLog[]): void {
  writeStore(KEYS.logs, logs);
}

export function getDemoMedia(): MediaAsset[] {
  return readStore<MediaAsset[]>(KEYS.media, DEMO_MEDIA_ASSETS);
}
export function saveDemoMedia(media: MediaAsset[]): void {
  writeStore(KEYS.media, media);
}

export function getDemoTasks(): WeeklyTask[] {
  return readStore<WeeklyTask[]>(KEYS.tasks, DEMO_WEEKLY_TASKS);
}
export function saveDemoTasks(tasks: WeeklyTask[]): void {
  writeStore(KEYS.tasks, tasks);
}

export function getDemoResourceRecords(): ResourceRoomRecord[] {
  return readStore<ResourceRoomRecord[]>(KEYS.records, DEMO_RESOURCE_RECORDS);
}
export function saveDemoResourceRecords(records: ResourceRoomRecord[]): void {
  writeStore(KEYS.records, records);
}

export function getDemoDevelopmentPlans(): StudentDevelopmentPlan[] {
  return readStore<StudentDevelopmentPlan[]>(KEYS.devPlans, DEMO_DEVELOPMENT_PLANS);
}
export function saveDemoDevelopmentPlans(plans: StudentDevelopmentPlan[]): void {
  writeStore(KEYS.devPlans, plans);
}
