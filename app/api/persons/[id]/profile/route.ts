import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Parses a "data:<mime>;base64,<data>" URL into its mime type and raw bytes.
function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) return null;
  try {
    return { mime: match[1], buffer: Buffer.from(match[2], "base64") };
  } catch {
    return null;
  }
}

// Serves a person's uploaded profile image as a real file (correct Content-Type),
// so the base64 stored in the DB can be viewed/downloaded at a URL.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return new Response("Invalid id", { status: 400 });
  }

  const person = await prisma.person.findUnique({
    where: { id },
    select: { profileBase64: true, firstName: true, lastName: true },
  });
  if (!person) return new Response("Not found", { status: 404 });

  const parsed = parseDataUrl(person.profileBase64);
  if (!parsed) return new Response("No image for this record", { status: 404 });

  const ext = (parsed.mime.split("/")[1] ?? "png").split("+")[0];
  const filename = `profile-${id}-${person.firstName}-${person.lastName}.${ext}`.replace(
    /[^\w.\-]/g,
    "_"
  );

  // Node's Buffer isn't in the DOM lib's BodyInit union; a plain Uint8Array is.
  return new Response(new Uint8Array(parsed.buffer), {
    headers: {
      "Content-Type": parsed.mime,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
