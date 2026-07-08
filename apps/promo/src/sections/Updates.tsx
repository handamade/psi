import { Tag, type TagProps } from "@dku/react";

import { UPDATES, type UpdateEntry } from "../content/updates";

const TAG_VARIANT: Record<UpdateEntry["tag"], NonNullable<TagProps["variant"]>> = {
  release: "accent",
  components: "success",
  tokens: "warning",
  docs: "neutral",
  site: "accent",
};

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function Updates() {
  return (
    <section className="section" id="updates">
      <div className="container">
        <div className="section-head">
          <span className="annot annot--accent">06 · Updates</span>
          <h2>What&apos;s new in the system.</h2>
          <p className="lede">
            Announcements land here as the system evolves — releases, new
            components, token changes. The feed is a typed file in the repo;
            publishing an update is a commit.
          </p>
        </div>
        <ol className="updates-list">
          {UPDATES.map((entry) => (
            <li className="card update" key={`${entry.date}-${entry.title}`}>
              <div className="update-meta">
                <time className="annot" dateTime={entry.date}>
                  {formatDate(entry.date)}
                </time>
                <Tag variant={TAG_VARIANT[entry.tag]} subtle>
                  {entry.tag}
                </Tag>
              </div>
              <div>
                <h3>{entry.title}</h3>
                <p>{entry.body}</p>
                {entry.link && (
                  <a className="update-link" href={entry.link.href}>
                    {entry.link.label} →
                  </a>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
