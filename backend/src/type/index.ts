export type TestCase = {
  id?: string;
  stdin?: string;
  expected_output?: string;
};

export type JobMessage = {
  jobId: string;
  type: 'sample' | 'submit';
  language_id: number;
  source_code: string;
  testCases: TestCase[];
  limits?: {
    cpu_time_limit?: number;
    wall_time_limit?: number;
    memory_limit?: number;
  };
  meta?: any;
};
