/**
 * Seed script for Egerer Classic 2026
 *
 * Run with: npx tsx scripts/seed.ts
 *
 * Requires env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * (Use service role key, not anon key, to bypass RLS for writes)
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function seed() {
  console.log('Seeding Egerer Classic 2026...\n')

  // 1. Tournament
  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .insert({ name: 'Egerer Classic 2026', location: 'Scottsdale, AZ', start_date: '2026-05-28', end_date: '2026-05-31', admin_pin: '1234' })
    .select()
    .single()
  if (tErr) throw tErr
  console.log('✓ Tournament:', tournament.id)
  const tid = tournament.id

  // 2. Courses
  const coursesData = [
    { name: 'Troon North – Monument', tee_name: 'White', slope: 138, rating: 72.1, total_par: 72 },
    { name: 'We-Ko-Pa – Saguaro', tee_name: 'White', slope: 135, rating: 71.8, total_par: 72 },
  ]
  const { data: courses, error: cErr } = await supabase.from('courses').insert(coursesData).select()
  if (cErr) throw cErr
  console.log('✓ Courses:', courses.map(c => c.name).join(', '))

  const troonId = courses.find(c => c.name.includes('Troon'))!.id
  const wekopaId = courses.find(c => c.name.includes('We-Ko-Pa'))!.id

  // 3. Holes — Troon North Monument (verify against physical scorecard on arrival!)
  const troonHoles = [
    { hole_number: 1, par: 4, stroke_index: 7, yardage: 412 },
    { hole_number: 2, par: 5, stroke_index: 11, yardage: 542 },
    { hole_number: 3, par: 3, stroke_index: 15, yardage: 183 },
    { hole_number: 4, par: 4, stroke_index: 1, yardage: 454 },
    { hole_number: 5, par: 4, stroke_index: 9, yardage: 395 },
    { hole_number: 6, par: 3, stroke_index: 17, yardage: 163 },
    { hole_number: 7, par: 4, stroke_index: 3, yardage: 438 },
    { hole_number: 8, par: 5, stroke_index: 13, yardage: 555 },
    { hole_number: 9, par: 4, stroke_index: 5, yardage: 423 },
    { hole_number: 10, par: 4, stroke_index: 8, yardage: 404 },
    { hole_number: 11, par: 3, stroke_index: 16, yardage: 208 },
    { hole_number: 12, par: 4, stroke_index: 2, yardage: 460 },
    { hole_number: 13, par: 4, stroke_index: 10, yardage: 388 },
    { hole_number: 14, par: 5, stroke_index: 12, yardage: 575 },
    { hole_number: 15, par: 3, stroke_index: 18, yardage: 137 },
    { hole_number: 16, par: 4, stroke_index: 4, yardage: 430 },
    { hole_number: 17, par: 4, stroke_index: 14, yardage: 375 },
    { hole_number: 18, par: 4, stroke_index: 6, yardage: 440 },
  ].map(h => ({ ...h, course_id: troonId }))

  // Holes — We-Ko-Pa Saguaro (verify against physical scorecard on arrival!)
  const wekopaHoles = [
    { hole_number: 1, par: 4, stroke_index: 5, yardage: 415 },
    { hole_number: 2, par: 4, stroke_index: 11, yardage: 380 },
    { hole_number: 3, par: 3, stroke_index: 15, yardage: 175 },
    { hole_number: 4, par: 5, stroke_index: 7, yardage: 550 },
    { hole_number: 5, par: 4, stroke_index: 1, yardage: 448 },
    { hole_number: 6, par: 3, stroke_index: 17, yardage: 155 },
    { hole_number: 7, par: 4, stroke_index: 3, yardage: 432 },
    { hole_number: 8, par: 5, stroke_index: 13, yardage: 535 },
    { hole_number: 9, par: 4, stroke_index: 9, yardage: 405 },
    { hole_number: 10, par: 4, stroke_index: 6, yardage: 420 },
    { hole_number: 11, par: 3, stroke_index: 16, yardage: 190 },
    { hole_number: 12, par: 5, stroke_index: 10, yardage: 560 },
    { hole_number: 13, par: 4, stroke_index: 2, yardage: 445 },
    { hole_number: 14, par: 4, stroke_index: 8, yardage: 400 },
    { hole_number: 15, par: 3, stroke_index: 18, yardage: 145 },
    { hole_number: 16, par: 4, stroke_index: 4, yardage: 435 },
    { hole_number: 17, par: 4, stroke_index: 14, yardage: 370 },
    { hole_number: 18, par: 4, stroke_index: 12, yardage: 425 },
  ].map(h => ({ ...h, course_id: wekopaId }))

  const { error: hErr } = await supabase.from('holes').insert([...troonHoles, ...wekopaHoles])
  if (hErr) throw hErr
  console.log('✓ Holes: 36 holes seeded')

  // 4. Players — UPDATE HANDICAP INDEXES BEFORE TOURNAMENT
  const playersData = [
    { name: 'Justin Egerer', handicap_index: 8.2 },
    { name: 'Matt Shamus', handicap_index: 15.4 },
    { name: 'Dan Kennedy', handicap_index: 12.1 },
    { name: 'Bryan Brand', handicap_index: 18.7 },
    { name: 'Brad White', handicap_index: 10.5 },
    { name: 'Christos Celmayster', handicap_index: 11.3 },
    { name: 'Justin Anderson', handicap_index: 14.0 },
    { name: 'Scott Schukart', handicap_index: 20.1 },
    { name: 'Pierre LaBarge', handicap_index: 22.5 },
    { name: 'Sean Downing', handicap_index: 16.3 },
    { name: 'Dave Flaherty', handicap_index: 13.8 },
    { name: 'Dusty Stutsman', handicap_index: 9.6 },
    { name: 'Erik Haney', handicap_index: 17.2 },
    { name: 'Jess Parker', handicap_index: 19.4 },
    { name: 'Andrew Fitzgerald', handicap_index: 24.0 },
    { name: 'Trey Evans', handicap_index: 7.8 },
  ].map(p => ({ ...p, tournament_id: tid }))

  const { error: pErr } = await supabase.from('players').insert(playersData)
  if (pErr) throw pErr
  console.log('✓ Players: 16 players seeded')

  // 5. Rounds
  const roundsData = [
    { tournament_id: tid, course_id: troonId, round_number: 1, date: '2026-05-29' },
    { tournament_id: tid, course_id: wekopaId, round_number: 2, date: '2026-05-30' },
  ]
  const { error: rErr } = await supabase.from('rounds').insert(roundsData)
  if (rErr) throw rErr
  console.log('✓ Rounds: 2 rounds seeded')

  // 6. Champions — ADD MISSING YEARS when Justin provides them
  const championsData = [
    { year: 2012, player_name: 'Justin Egerer' },
    { year: 2019, player_name: 'Justin Egerer' },
    { year: 2023, player_name: 'Justin Egerer' },
    { year: 2024, player_name: 'Brad White & Christos Celmayster' },
    // Add more years as provided:
    // { year: 2013, player_name: 'TBD' },
    // { year: 2014, player_name: 'TBD' },
    // ...
  ].map(c => ({ ...c, tournament_id: tid }))

  const { error: chErr } = await supabase.from('champions').insert(championsData)
  if (chErr) throw chErr
  console.log('✓ Champions: seeded known champions')

  console.log('\n✅ Seed complete!')
}

seed().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
