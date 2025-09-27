declare module 'gsap' {
    interface GSAPAnimation {
        kill(): void;
    }

    interface GSAP {
        registerPlugin(...args: any[]): void;
        context(func: () => void): { revert: () => void };
        fromTo(targets: any, fromVars: object, toVars: object): GSAPAnimation;
        to(targets: any, vars: object): GSAPAnimation;
        from(targets: any, vars: object): GSAPAnimation;
        [key: string]: any;
    }

    const gsap: GSAP;
    export default gsap;
}

declare module 'gsap/ScrollTrigger' {
    interface ScrollTrigger {
        kill(): void;
        enable(): void;
        disable(): void;
    }

    const ScrollTrigger: {
        create(vars: object): ScrollTrigger;
        refresh(): void;
        new (): ScrollTrigger;
    };

    export { ScrollTrigger };
    export default ScrollTrigger;
}