import { useState } from "react";
import { CursorPagination, Text } from "@handamade/psi-react";

const pages = [["Aurora", "Birch", "Cedar"], ["Dune", "Ember", "Fjord"], ["Glade", "Harbor", "Isle"]];

export default function CursorPaginationBasic() {
  const [index, setIndex] = useState(0);
  return (
    <div className="psi-gap-12" style={{ display: "flex", flexDirection: "column" }}>
      <Text>{pages[index].join(", ")}</Text>
      <CursorPagination
        hasPrevious={index > 0}
        hasNext={index < pages.length - 1}
        onPrevious={() => setIndex(index - 1)}
        onNext={() => setIndex(index + 1)}
      />
    </div>
  );
}
