import { useState } from "react";
import { Pagination } from "@handamade/psi-react";

export default function PaginationBasic() {
  const [page, setPage] = useState(3);
  return <Pagination page={page} pageCount={12} onPageChange={setPage} />;
}
