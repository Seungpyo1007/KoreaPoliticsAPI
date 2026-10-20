import { assertEquals } from "@std/assert";
import { personId, romanize } from "./romanize.ts";

Deno.test("syllables follow the official tables", () => {
  assertEquals(romanize("곽"), "gwak");
  assertEquals(romanize("상언"), "sangeon");
  assertEquals(romanize("최"), "choe");
  assertEquals(romanize("의"), "ui");
  assertEquals(romanize("쌍"), "ssang");
});

Deno.test("names keep no sound changes", () => {
  assertEquals(romanize("복남"), "boknam");
  assertEquals(romanize("종로"), "jongro");
});

Deno.test("ㄹㄹ is ll", () => {
  assertEquals(romanize("결례"), "gyeollye");
});

Deno.test("person ids", () => {
  assertEquals(personId("곽", "상언", 1971), "gwak-sangeon-1971");
  assertEquals(personId("이", "재명", 1964), "i-jaemyeong-1964");
  assertEquals(personId("남궁", "민", 1980), "namgung-min-1980");
  assertEquals(personId("김", "철수", 1970, 2), "gim-cheolsu-1970-2");
});
