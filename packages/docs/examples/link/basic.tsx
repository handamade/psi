import { Link, Text } from "@handamade/psi-react";

/** In running text the link takes the sentence's font; current marks the page you are on. */
export default function LinkBasic() {
  return (
    <div>
      <Text>
        Pick a <Link href="/docs/components/button/">Button</Link> for actions and a Link for navigation.
      </Text>
      <Text>
        <Link href="/docs/components/button/">Button</Link> · <Link href="/docs/components/link/" current>Link</Link> ·{" "}
        <Link href="/docs/components/text/">Text</Link>
      </Text>
    </div>
  );
}
