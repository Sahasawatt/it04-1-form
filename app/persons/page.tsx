import Link from "next/link";
import { prisma } from "@/lib/prisma";

// Query the DB on every request. Never prerender at build time — there is no
// database reachable during `next build`, so a static render would fail.
export const dynamic = "force-dynamic";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// birthDay is stored as a @db.Date (UTC midnight); format back to dd/mm/yyyy.
function formatBirthDay(d: Date): string {
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

function formatCreatedAt(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(
    d.getUTCHours()
  )}:${pad(d.getUTCMinutes())} UTC`;
}

export default async function PersonsPage() {
  const persons = await prisma.person.findMany({ orderBy: { id: "desc" } });

  return (
    <main className="page">
      <div className="card wide">
        <div className="card-header">
          <span>Saved Records ({persons.length})</span>
          <Link href="/" className="header-link">
            + New record
          </Link>
        </div>

        <div className="card-body">
          {persons.length === 0 ? (
            <p className="empty">
              No records yet. <Link href="/">Add one →</Link>
            </p>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Profile</th>
                    <th>First Name</th>
                    <th>Last Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Birth Day</th>
                    <th>Occupation</th>
                    <th>Sex</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {persons.map((p) => (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td>
                        {p.profileBase64 ? (
                          <a
                            className="thumb-link"
                            href={`/api/persons/${p.id}/profile`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View uploaded image"
                          >
                            <img className="thumb" src={p.profileBase64} alt={`${p.firstName} ${p.lastName}`} />
                          </a>
                        ) : (
                          <span className="no-img">—</span>
                        )}
                      </td>
                      <td>{p.firstName}</td>
                      <td>{p.lastName}</td>
                      <td>{p.email}</td>
                      <td>{p.phone}</td>
                      <td>{formatBirthDay(p.birthDay)}</td>
                      <td>{p.occupation}</td>
                      <td>{p.sex}</td>
                      <td className="muted">{formatCreatedAt(p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
