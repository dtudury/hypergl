
import Model from "./lib/DupserModel";


let model:Model = new Model();

let h = function() {};

//work inside shell we can "crash" to; ultimate-modal
if (!window.indexedDB) {
    window.alert("Your browser doesn't support a stable version of IndexedDB.");
}


let test = (val:number) => {
    console.log(val);
};

test(4);

var asdf = <test>foo</test>;
