(function () {
    var bags = new WeakMap();
    var active = null;

    function notify(hit, value, oldValue) {
        hit.watchers.slice().forEach(function (cb) { cb(value, oldValue); });
    }

    function track(hit) {
        if (!active || !hit) return;
        if (hit.watchers.indexOf(active) < 0) hit.watchers.push(active);
    }

    function contentText(value) {
        try { return JSON.stringify(value); }
        catch (e) { return null; }
    }

    window.ref = function (value) {
        var hit = { watchers: [] };
        var state = {};
        Object.defineProperty(state, '__v_isRef', { value: true });
        Object.defineProperty(state, 'value', {
            enumerable: true,
            get: function () {
                track(hit);
                return value;
            },
            set: function (v) {
                if (Object.is(v, value)) return;
                var oldValue = value;
                value = v;
                notify(hit, v, oldValue);
            }
        });
        bags.set(state, hit);
        return state;
    };

    function touch(hit) {
        while (hit) {
            var next = contentText(hit.raw);
            if (next == null || next !== hit.snap) {
                hit.snap = next;
                notify(hit, hit.proxy, hit.proxy);
            }
            hit = hit.parent;
        }
    }

    window.reactive = function reactive(data, parent) {
        if (data == null || typeof data !== 'object') data = {};
        var hit = bags.get(data);
        if (hit) {
            if (parent && !hit.parent) hit.parent = parent;
            return hit.proxy;
        }
        hit = { proxy: null, raw: data, parent: parent || null, watchers: [], queued: false, snap: contentText(data) };
        var proxy = new Proxy(data, {
            get: function (target, key, receiver) {
                track(hit);
                var value = Reflect.get(target, key, receiver);
                if (!value || typeof value !== 'object') return value;
                return reactive(value, hit);
            },
            set: function (target, key, value) {
                // 修改内容：值没变就不通知，避免和表单控件互相写
                if (Object.is(target[key], value)) return true;
                target[key] = value;
                touch(hit);
                return true;
            }
        });
        hit.proxy = proxy;
        bags.set(data, hit);
        bags.set(proxy, hit);
        return proxy;
    };

    window.watch = function (source, cb, options) {
        if (typeof source === 'function') {
            if (typeof cb !== 'function') return function () { };
            var oldVal;
            var started = false;
            function runner() {
                active = runner;
                var next;
                try { next = source(); }
                finally { active = null; }
                if (!started) {
                    oldVal = next;
                    started = true;
                    if (options && options.immediate) cb(next);
                    return;
                }
                if (Object.is(next, oldVal)) return;
                var prev = oldVal;
                oldVal = next;
                cb(next, prev);
            }
            runner();
            return function () { };
        }
        var hit = bags.get(source);
        if (!hit || typeof cb !== 'function') return function () { };
        hit.watchers.push(cb);
        if (options && options.immediate) cb(source.__v_isRef ? source.value : source);
        return function () {
            var i = hit.watchers.indexOf(cb);
            if (i >= 0) hit.watchers.splice(i, 1);
        };
    };
})();
