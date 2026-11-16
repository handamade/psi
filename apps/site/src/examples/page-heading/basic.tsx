import { PageHeading, Panel, Text } from "@handamade/psi-react";

/** PageHeading is always an h1, and this docs page already has one, so the
 * example sits in a labelled region of its own. In your app it is the first
 * thing on the page. */
export default function PageHeadingBasic() {
  return (
    <section aria-label="Example page">
      <Panel>
        <PageHeading>Team settings</PageHeading>
        <Text as="h2" size={16} weight="medium">
          Members
        </Text>
      </Panel>
    </section>
  );
}
