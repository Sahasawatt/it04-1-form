import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validatePerson } from "@/lib/validation";

// GET queries the DB fresh on every request; without this, Next 14 would
// statically render (and cache) this parameter-less GET handler at build time.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const result = validatePerson(body);

  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  try {
    const created = await prisma.person.create({ data: result.value });
    return NextResponse.json(
      { id: created.id, message: "save data success" },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/persons failed:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const persons = await prisma.person.findMany({
      orderBy: { id: "desc" },
      take: 20,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        occupation: true,
        createdAt: true,
      },
    });
    return NextResponse.json(persons);
  } catch (err) {
    console.error("GET /api/persons failed:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
