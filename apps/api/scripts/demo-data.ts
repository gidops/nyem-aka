// Fills a development database with realistic sample data by calling the running
// API, exactly as the web app would. Because every request goes through the real
// endpoints, the data obeys all the rules (timeline entries, audit entries, etc.).
//
//   1. Start the API:   npm run dev:api
//   2. Run:             npm run demo -w api
//
// Safe to run twice: it stops if the demo requester already has requests.
// Do not run it against production.
import 'dotenv/config';
import { deflateSync } from 'node:zlib';

const API = process.env.DEMO_API_URL ?? 'http://localhost:4000';
const PASSWORD = process.env.DEMO_PASSWORD ?? 'NyemAka-Demo-2026!';

const USERS = [
  { key: 'requester', email: 'ada@nyemaka.local', fullName: 'Ada Okafor', role: 'REQUESTER', department: 'Computer Science' },
  { key: 'requester2', email: 'tunde@nyemaka.local', fullName: 'Tunde Bello', role: 'REQUESTER', department: 'Library' },
  { key: 'officer', email: 'chidi@nyemaka.local', fullName: 'Chidi Eze', role: 'OFFICER', department: 'Works & Maintenance' },
  { key: 'officer2', email: 'ngozi@nyemaka.local', fullName: 'Ngozi Adeyemi', role: 'OFFICER', department: 'Works & Maintenance' },
] as const;

type UserKey = (typeof USERS)[number]['key'] | 'admin';
type Step =
  | { do: 'assign'; officer: 'officer' | 'officer2'; note?: string }
  | { do: 'status'; as: UserKey; status: string; note?: string }
  | { do: 'cancel' };

const REQUESTS: {
  by: 'requester' | 'requester2';
  title: string;
  description: string;
  location: string;
  category: string;
  priority: string;
  photos?: number;
  steps: Step[];
}[] = [
  {
    by: 'requester',
    title: 'Leaking tap in Lab 2',
    description: 'The cold tap at the back sink drips constantly and the floor around it is wet. Someone could slip.',
    location: 'Science Block, Lab 2',
    category: 'Plumbing',
    priority: 'HIGH',
    photos: 2,
    steps: [
      { do: 'assign', officer: 'officer', note: 'Please attend today, the floor is wet.' },
      { do: 'status', as: 'officer', status: 'IN_PROGRESS', note: 'On site. Washer is worn.' },
      { do: 'status', as: 'officer', status: 'COMPLETED', note: 'Washer replaced and tap tested. Floor dried.' },
    ],
  },
  {
    by: 'requester',
    title: 'Projector will not turn on in LT1',
    description: 'The ceiling projector shows no power light. Lectures at 10am tomorrow need it.',
    location: 'Lecture Theatre 1',
    category: 'ICT / Network',
    priority: 'URGENT',
    photos: 1,
    steps: [
      { do: 'assign', officer: 'officer2' },
      { do: 'status', as: 'officer2', status: 'IN_PROGRESS', note: 'Checking the power supply.' },
    ],
  },
  {
    by: 'requester2',
    title: 'Flickering lights in the reading room',
    description: 'Three ceiling lights near the windows flicker all evening. It is hard to read.',
    location: 'Main Library, 2nd floor reading room',
    category: 'Electrical',
    priority: 'MEDIUM',
    steps: [{ do: 'assign', officer: 'officer' }],
  },
  {
    by: 'requester2',
    title: 'Air conditioner dripping onto desks',
    description: 'The split unit above the issue desk drips water onto the counter whenever it runs.',
    location: 'Main Library, issue desk',
    category: 'HVAC',
    priority: 'HIGH',
    photos: 1,
    steps: [],
  },
  {
    by: 'requester',
    title: 'Broken door handle, Room 12',
    description: 'The inside handle has come off. The door can only be opened from outside.',
    location: 'Hostel B, Room 12',
    category: 'Carpentry',
    priority: 'MEDIUM',
    steps: [],
  },
  {
    by: 'requester',
    title: 'Overflowing bins behind the cafeteria',
    description: 'The bins have not been emptied for several days and are attracting flies.',
    location: 'Cafeteria, rear entrance',
    category: 'Cleaning',
    priority: 'LOW',
    steps: [],
  },
  {
    by: 'requester2',
    title: 'Please repaint my office',
    description: 'I would like the walls of my office repainted in a lighter colour.',
    location: 'Admin Block, Office 4',
    category: 'Other',
    priority: 'LOW',
    steps: [{ do: 'status', as: 'admin', status: 'REJECTED', note: 'Redecoration is not a maintenance fault. Please raise it with Estates.' }],
  },
  {
    by: 'requester',
    title: 'Socket sparks when used',
    description: 'The double socket by the window sparks when a plug is inserted. I have stopped using it.',
    location: 'Science Block, Room 7',
    category: 'Electrical',
    priority: 'URGENT',
    photos: 1,
    steps: [
      { do: 'assign', officer: 'officer' },
      { do: 'assign', officer: 'officer2', note: 'Ngozi is the qualified electrician.' },
      { do: 'status', as: 'officer2', status: 'IN_PROGRESS' },
      { do: 'status', as: 'officer2', status: 'COMPLETED', note: 'Socket replaced.' },
      { do: 'status', as: 'admin', status: 'IN_PROGRESS', note: 'Requester reports it still sparks. Please re-check the wiring.' },
    ],
  },
  {
    by: 'requester',
    title: 'Reported by mistake',
    description: 'I reported the wrong room. Submitting a new request instead.',
    location: 'Hostel B',
    category: 'Other',
    priority: 'LOW',
    steps: [{ do: 'cancel' }],
  },
];

// ── A tiny PNG encoder, so the demo has real photos without any image files. ──
function crc32(buffer: Buffer): number {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return ~crc >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

// A 480×270 picture with soft diagonal bands in the given colour.
function placeholderPng([r, g, b]: [number, number, number]): Buffer {
  const width = 480;
  const height = 270;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 3 + 1);
    for (let x = 0; x < width; x += 1) {
      const shade = 0.75 + 0.25 * Math.sin((x + y) / 28);
      raw[row + 1 + x * 3] = Math.round(r * shade);
      raw[row + 2 + x * 3] = Math.round(g * shade);
      raw[row + 3 + x * 3] = Math.round(b * shade);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8); // 8 bits per channel, RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const PHOTO_COLOURS: [number, number, number][] = [
  [181, 123, 96],
  [120, 144, 156],
  [150, 160, 120],
];

// ── A minimal API client that keeps one cookie header per signed-in user. ──
async function call(path: string, options: { method?: string; cookie?: string; json?: unknown; form?: FormData } = {}) {
  const response = await fetch(`${API}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.cookie && { Cookie: options.cookie }),
      ...(options.json !== undefined && { 'Content-Type': 'application/json' }),
    },
    body: options.form ?? (options.json !== undefined ? JSON.stringify(options.json) : undefined),
  });
  return response;
}

async function mustCall(...args: Parameters<typeof call>) {
  const response = await call(...args);
  if (!response.ok) {
    throw new Error(`${args[1]?.method ?? 'GET'} ${args[0]} failed: ${response.status} ${await response.text()}`);
  }
  return response;
}

// The login route allows 5 attempts a minute per client, and this script needs 5.
// If the limit is hit (429), wait for the window to pass and try once more.
async function login(email: string, password: string): Promise<string> {
  let response = await call('/auth/login', { method: 'POST', json: { email, password } });
  if (response.status === 429) {
    console.log('Login rate limit reached; waiting 60 seconds…');
    await new Promise((resolve) => setTimeout(resolve, 61_000));
    response = await call('/auth/login', { method: 'POST', json: { email, password } });
  }
  if (!response.ok) throw new Error(`Login as ${email} failed: ${response.status} ${await response.text()}`);
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ');
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set');
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to create demo data in production');

  const cookies = {} as Record<UserKey, string>;
  cookies.admin = await login(adminEmail, adminPassword);

  for (const user of USERS) {
    const { key, ...body } = user;
    const created = await call('/users', { method: 'POST', cookie: cookies.admin, json: { ...body, password: PASSWORD } });
    if (!created.ok && created.status !== 409) {
      throw new Error(`Could not create ${user.email}: ${created.status} ${await created.text()}`);
    }
    console.log(`${created.status === 409 ? 'exists ' : 'created'}  ${user.role.padEnd(9)} ${user.email}`);
    cookies[key] = await login(user.email, PASSWORD);
  }

  const existing = (await (await mustCall('/requests?limit=1', { cookie: cookies.requester })).json()) as {
    meta: { total: number };
  };
  if (existing.meta.total > 0) {
    console.log('\nDemo requests already exist; nothing more to do.');
    return;
  }

  const categories = (await (await mustCall('/categories', { cookie: cookies.admin })).json()) as { id: number; name: string }[];
  const officers = (await (await mustCall('/users?role=OFFICER&limit=100', { cookie: cookies.admin })).json()) as {
    data: { id: string; email: string }[];
  };
  const officerId = (key: 'officer' | 'officer2') =>
    officers.data.find((officer) => officer.email === USERS.find((user) => user.key === key)!.email)!.id;

  for (const item of REQUESTS) {
    const category = categories.find((candidate) => candidate.name === item.category);
    if (!category) throw new Error(`Category "${item.category}" not found. Run "npx prisma db seed" first.`);

    const created = (await (
      await mustCall('/requests', {
        method: 'POST',
        cookie: cookies[item.by],
        json: {
          title: item.title,
          description: item.description,
          location: item.location,
          categoryId: category.id,
          priority: item.priority,
        },
      })
    ).json()) as { id: string; reference: string };

    for (let index = 0; index < (item.photos ?? 0); index += 1) {
      const form = new FormData();
      form.append('file', new Blob([new Uint8Array(placeholderPng(PHOTO_COLOURS[index % PHOTO_COLOURS.length]))], { type: 'image/png' }), `photo-${index + 1}.png`);
      await mustCall(`/requests/${created.id}/attachments`, { method: 'POST', cookie: cookies[item.by], form });
    }

    for (const step of item.steps) {
      if (step.do === 'assign') {
        await mustCall(`/requests/${created.id}/assign`, {
          method: 'POST',
          cookie: cookies.admin,
          json: { officerId: officerId(step.officer), ...(step.note && { note: step.note }) },
        });
      } else if (step.do === 'cancel') {
        await mustCall(`/requests/${created.id}/cancel`, { method: 'POST', cookie: cookies[item.by] });
      } else {
        await mustCall(`/requests/${created.id}/status`, {
          method: 'PATCH',
          cookie: cookies[step.as],
          json: { status: step.status, ...(step.note && { note: step.note }) },
        });
      }
    }
    console.log(`${created.reference}  ${item.title}`);
  }

  console.log(`\nDone. Sign in with any demo account using the password: ${PASSWORD}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
