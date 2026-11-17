import { DescriptionItem, DescriptionList } from "@handamade/psi-react";

export default function DescriptionListBasic() {
  return (
    <DescriptionList layout="inline">
      <DescriptionItem term="Plan">Team</DescriptionItem>
      <DescriptionItem term="Seats">12</DescriptionItem>
      <DescriptionItem term="Renews">1 March 2027</DescriptionItem>
    </DescriptionList>
  );
}
