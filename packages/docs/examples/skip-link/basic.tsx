import { SkipLink, Text } from "@handamade/psi-react";

/** The link is invisible until it takes keyboard focus: click here, then press Tab. */
export default function SkipLinkBasic() {
  return (
    <div>
      <SkipLink href="#example-target">Skip to the example content</SkipLink>
      <Text tone="secondary">Press Tab once to reveal the skip link, Enter to follow it.</Text>
      <div id="example-target" tabIndex={-1}>
        <Text>Example content.</Text>
      </div>
    </div>
  );
}
