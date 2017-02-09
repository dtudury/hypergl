//3 parts
//1: notifier
//2: message (delta)
//3: sync'ed
export default class DupserModel {
    private built: boolean;
    constructor() {
        this.built = true;
        console.log(this.built);
    }
}
