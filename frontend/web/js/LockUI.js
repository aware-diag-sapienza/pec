const LockUI = (function() {
    let transitionDuration = 400;
    /*
    */
    let layer = {
        element: null,
        attrs: {
            id: "___d3-lockUI-layer___",
        },
        styles: {
            "position": "fixed",
            "left": 0,
            "top": 0,
            "right": 0,
            "bottom": 0,
            "overflow": "hidden",
            "background-color": "rgba(0,0,0,0.6)",
            "z-index": 2000,
            "opacity": 0.75,
            "display": "flex",
            "align-items": "center",
            "justify-content": "center",
        }
    }
    let body = {
        element: null,
        attrs: {
            id: "___d3-lockUI-body___",
        },
        styles: {
            "display": "flex",
            "flex-direction": "column",
            "align-items": "center",
            "justify-content": "center",
            "padding": "1em",
            "border-radius": "10px",
            //"background": "white",
        }
    };
    let message = {
        element: null,
        attrs: {
            id: "___d3-lockUI-message___",
        },
        styles: {
            "min-width": "40vw",
            "color": "black",
            "box-sizing": "border-box",
            "text-align": "center",
            "font-weight": 500,
            "font-size": "1.5em"
        }
    };
    let spinner = {
        element: null,
        attrs: {
            id: "___d3-lockUI-spinner___",
        },
        styles: {
            "width": "10vw",
            "height": "10vw",
            "min-width": "50px",
            "min-height": "50px",
            "box-sizing": "border-box",
            "margin": "1em",
            "border-radius": "50%",
            "border": "4px solid #aaa",
            "border-top-color": "#007bff",
            "animation": "___d3-lockUI-animation___ 1s linear infinite",
        }
    };
    /*
    */
    let setAttrs = (selection, attrs) => {
        d3.entries(attrs).forEach((a) => {
            selection.attr(a.key, a.value)
        });
    };
    let setStyles = (selection, styles) => {
        d3.entries(styles).forEach((s) => {
            selection.style(s.key, s.value)
        });
    };
    let createDomElements = () => {
        d3.select("head").append("style").text("@keyframes ___d3-lockUI-animation___ {to {transform: rotate(360deg);}}");
        layer.element = d3.select("body").insert("div", ":first-child");
        setAttrs(layer.element, layer.attrs);
        setStyles(layer.element, layer.styles);
        body.element = layer.element.append("div");
        setAttrs(body.element, body.attrs);
        setStyles(body.element, body.styles);
        spinner.element = body.element.append("div");
        setAttrs(spinner.element, spinner.attrs);
        setStyles(spinner.element, spinner.styles);
        message.element = body.element.append("div").text("Please wait...");
        setAttrs(message.element, message.attrs);
        setStyles(message.element, message.styles);
    }
    /*
    */
    this.lock = (options = {}) => {
        if(layer.element == null) createDomElements();
        if(options.message !== undefined) message.element.html(options.message);
        else message.element.html("");
        layer.element.style("opacity", 0)
            .style("display", layer.styles.display)
            .transition()
            .duration(transitionDuration)
            .style("opacity", 1)
            .on("end", () => {
                if(options.timeout !== undefined){
                    setTimeout( () => { this.unlock() }, options.timeout);
                }
            });
    }
    /*
    */
    this.unlock = () => {
        if(layer.element == null){
            console.warn("Called unlock() before lock().");
            return;
        }
        layer.element.transition()
            .duration(transitionDuration)
            .style("opacity", 0)
            .on("end", () => {
                layer.element.style("display", "none");
            });
    }
    /*
    */
    return this;
}).call({});