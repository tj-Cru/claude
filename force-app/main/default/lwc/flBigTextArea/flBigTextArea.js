import { LightningElement, api } from 'lwc';
// 1. Import the Flow support event
import { FlowAttributeChangeEvent } from 'lightning/flowSupport';

export default class FlBigTextArea extends LightningElement {
    @api label;
    @api value;
    @api required;
    @api rows;

    renderedCallback() {
        if(this.rows) {
            const style = this.template.host.style;
            // Calculate height (approx 21px per row + padding)
            const height = (this.rows * 21) + 12; 
            style.setProperty('--sds-c-textarea-sizing-min-height', `${height}px`);
        }
    }

    handleChange(event) {
        this.value = event.target.value;
        
        // 2. Dispatch the event to tell Flow the value changed
        // This triggers "Reactivity" so visibility rules update immediately
        const attributeChangeEvent = new FlowAttributeChangeEvent('value', this.value);
        this.dispatchEvent(attributeChangeEvent);
    }
}