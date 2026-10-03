import * as state from '@codemirror/state';
import * as view from '@codemirror/view';
import * as commands from '@codemirror/commands';
import * as language from '@codemirror/language';
import * as autocomplete from '@codemirror/autocomplete';
import * as highlight from '@lezer/highlight';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { rust } from '@codemirror/lang-rust';
import { php } from '@codemirror/lang-php';
import { go } from '@codemirror/lang-go';
import { ruby } from '@codemirror/legacy-modes/mode/ruby';
import { lua } from '@codemirror/legacy-modes/mode/lua';
import { perl } from '@codemirror/legacy-modes/mode/perl';
import { swift } from '@codemirror/legacy-modes/mode/swift';
import { haskell } from '@codemirror/legacy-modes/mode/haskell';
import { csharp, kotlin, scala, dart, objectiveC } from '@codemirror/legacy-modes/mode/clike';
import { d } from '@codemirror/legacy-modes/mode/d';
import { groovy } from '@codemirror/legacy-modes/mode/groovy';
import { r } from '@codemirror/legacy-modes/mode/r';
import { oCaml, fSharp } from '@codemirror/legacy-modes/mode/mllike';
import { erlang } from '@codemirror/legacy-modes/mode/erlang';
import { pascal } from '@codemirror/legacy-modes/mode/pascal';
import { fortran } from '@codemirror/legacy-modes/mode/fortran';
import { commonLisp } from '@codemirror/legacy-modes/mode/commonlisp';
import { scheme } from '@codemirror/legacy-modes/mode/scheme';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { julia } from '@codemirror/legacy-modes/mode/julia';
import { crystal } from '@codemirror/legacy-modes/mode/crystal';
import { coffeeScript } from '@codemirror/legacy-modes/mode/coffeescript';
import { standardSQL } from '@codemirror/legacy-modes/mode/sql';

const S = (mode) => () => language.StreamLanguage.define(mode);
/** Lower-case language name -> () => CodeMirror language extension. */
const langs = {
  javascript: () => javascript(),
  typescript: () => javascript({ typescript: true }),
  python: () => python(),
  c: () => cpp(), 'c++': () => cpp(), java: () => java(), rust: () => rust(), php: () => php(), go: () => go(),
  ruby: S(ruby), lua: S(lua), perl: S(perl), swift: S(swift), haskell: S(haskell),
  'c#': S(csharp), kotlin: S(kotlin), scala: S(scala), dart: S(dart), 'objective-c': S(objectiveC),
  d: S(d), groovy: S(groovy), r: S(r), ocaml: S(oCaml), 'f#': S(fSharp), erlang: S(erlang),
  pascal: S(pascal), fortran: S(fortran), 'common lisp': S(commonLisp), lisp: S(commonLisp), scheme: S(scheme),
  bash: S(shell), julia: S(julia), crystal: S(crystal), coffeescript: S(coffeeScript), sql: S(standardSQL)
};
export { state, view, commands, language, autocomplete, highlight, langs };
