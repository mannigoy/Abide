// Checks every reading plan in assets/guided_plans.
// Run with: npm run check:plans
//
// It uses the same code the app uses to read plans (src/lib/plan-data.ts),
// so if this passes, the app can load them too.

import { readdirSync, readFileSync } from 'node:fs';

import { findProblems, toPlan, type Plan, type RawPlan } from '../src/lib/plan-data.ts';

const folder = 'assets/guided_plans';
const files = readdirSync(folder).filter((name) => name.endsWith('.json'));
const plansModule = readFileSync('src/lib/plans.ts', 'utf8');

const problems: string[] = [];
const plans: Plan[] = [];
const seenIds = new Map<string, string>();

for (const file of files) {
  // The app only knows about files that lib/plans.ts imports.
  if (!plansModule.includes(`guided_plans/${file}`)) problems.push(`${file}: not imported in src/lib/plans.ts`);

  let plan: Plan;
  try {
    plan = toPlan(JSON.parse(readFileSync(`${folder}/${file}`, 'utf8')) as RawPlan);
  } catch (error) {
    problems.push(`${file}: ${(error as Error).message}`);
    continue;
  }
  if (seenIds.has(plan.id)) problems.push(`${file}: id "${plan.id}" is also used in ${seenIds.get(plan.id)}`);
  seenIds.set(plan.id, file);
  problems.push(...findProblems(plan));
  plans.push(plan);
}

for (const plan of plans) {
  const verses = plan.days.filter((d) => d.readings.some((r) => r.startVerse)).length;
  console.log(`✓ ${plan.id.padEnd(16)} ${String(plan.days.length).padStart(2)} days  [${plan.categories.join(', ')}]  ${verses} days with verse ranges`);
}
const sample = plans.find((p) => p.id === 'mark-41-day')?.days[5];
if (sample) console.log(`\nExample (Mark day 6): "${sample.title}" → ${sample.passage}`, sample.readings);
console.log(`\nCategories: ${[...new Set(plans.flatMap((p) => p.categories))].sort().join(', ')}`);

if (problems.length > 0) {
  console.error(`\n✗ ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`\nAll ${plans.length} plans are OK.`);
