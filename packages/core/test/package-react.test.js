// package-react.test.js — Built React wrappers on React 19 (requires `pnpm build`).

import { runReactSuite } from "./adapters/react-suite.js";

await runReactSuite({ major: 19 });
