import { expect, use as chaiUse } from 'chai';
import { spy } from 'sinon';
import { Signal } from '../src';
import * as sinonChai from 'sinon-chai';

chaiUse(sinonChai);

describe('Signal', function ()
{
    describe('#handlers', function ()
    {
        it('returns the active handlers', function ()
        {
            const s = new Signal();
            expect(s.handlers()).to.be.empty;

            const binding = s.add(() => {});
            expect(s.handlers()).to.have.lengthOf(1);
            expect(s.handlers()[0]).to.have.equal(binding);
        });
    });

    describe('#hasAny', function ()
    {
        it('returns false when no handlers exist', function ()
        {
            const s = new Signal();
            expect(s.hasAny()).to.be.false;
        });

        it('returns false when no handlers exist', function ()
        {
            const s = new Signal();
            s.add(() => {});
            expect(s.hasAny()).to.be.true;
        });
    });

    describe('#has', function ()
    {
        it('returns true when the handler is owned', function ()
        {
            const s = new Signal();
            const b = s.add(() => {});
            expect(s.has(b)).to.be.true;
        });

        it('returns false when the handler is not owned', function ()
        {
            const s0 = new Signal();
            const s1 = new Signal();
            const b = s0.add(() => {});
            expect(s1.has(b)).to.be.false;
        });
    });

    describe('#dispatch', function ()
    {
        it('calls each of the handlers', function ()
        {
            const sp0 = spy();
            const sp1 = spy();
            const s = new Signal();

            s.add(sp0);
            s.add(sp1);
            s.dispatch();

            expect(sp0).to.be.calledOnce;
            expect(sp1).to.be.calledOnce;
        });

        it('calls the handler with the correct parameters', function ()
        {
            const sp = spy();
            const s = new Signal<(a: number, b: number, c: string) => void>();

            s.add(sp);
            s.dispatch(1, 2, 'bar');

            expect(sp).to.be.calledOnceWithExactly(1, 2, 'bar');
        });
    });

    describe('#add', function ()
    {
        it('adds a handler that is called each dispatch', function ()
        {
            const sp = spy();
            const s = new Signal();

            s.add(sp);
            expect(s.handlers()).to.have.lengthOf(1);

            s.dispatch();
            expect(sp).to.be.calledOnce;
            expect(s.handlers()).to.have.lengthOf(1);
            s.dispatch();
            expect(sp).to.be.calledTwice;
            expect(s.handlers()).to.have.lengthOf(1);
            s.dispatch();
            expect(sp).to.be.calledThrice;
            expect(s.handlers()).to.have.lengthOf(1);
        });
    });

    describe('#once', function ()
    {
        it('adds a handler that is only called once', function ()
        {
            const sp = spy();
            const s = new Signal();

            s.once(sp);
            expect(s.handlers()).to.have.lengthOf(1);

            s.dispatch();
            expect(sp).to.be.calledOnce;
            expect(s.handlers()).to.have.lengthOf(0);

            s.dispatch();
            expect(sp).to.be.calledOnce;
            expect(s.handlers()).to.have.lengthOf(0);
        });
    });

    describe('#detach', function ()
    {
        it('removes a handler', function ()
        {
            const s = new Signal();

            const b0 = s.add(() => {});
            const b1 = s.add(() => {});
            expect(s.handlers()).to.have.lengthOf(2);

            s.detach(b0);
            expect(s.handlers()).to.have.lengthOf(1);
            expect(s.handlers()[0]).to.equal(b1);

            s.detach(b1);
            expect(s.handlers()).to.have.lengthOf(0);
        });

        it('removes using the binding', function ()
        {
            const s = new Signal();

            const b0 = s.add(() => {});
            const b1 = s.add(() => {});
            expect(s.handlers()).to.have.lengthOf(2);

            b0.detach();
            expect(s.handlers()).to.have.lengthOf(1);
            expect(s.handlers()[0]).to.equal(b1);

            b1.detach();
            expect(s.handlers()).to.have.lengthOf(0);
        });

        it('removes using the binding (dispose)', function ()
        {
            const s = new Signal();

            const b0 = s.add(() => {});
            const b1 = s.add(() => {});
            expect(s.handlers()).to.have.lengthOf(2);

            b0.dispose();
            expect(s.handlers()).to.have.lengthOf(1);
            expect(s.handlers()[0]).to.equal(b1);

            b1.dispose();
            expect(s.handlers()).to.have.lengthOf(0);
        });
    });

    describe('#detachAll', function ()
    {
        it('removes all handlers', function ()
        {
            const s = new Signal();

            s.add(() => {});
            s.add(() => {});
            expect(s.handlers()).to.have.lengthOf(2);

            s.detachAll();
            expect(s.handlers()).to.have.lengthOf(0);
        });
    });

    describe('#filter', function ()
    {
        it('dispatches when it returns true', function ()
        {
            const sp0 = spy();
            const sp1 = spy();
            const s = new Signal();

            s.add(sp0);
            s.once(sp1);
            s.filter(() => true);
            expect(s.handlers()).to.have.lengthOf(2);

            s.dispatch();
            expect(sp0).to.have.been.calledOnce;
            expect(sp1).to.have.been.calledOnce;
            expect(s.handlers()).to.have.lengthOf(1);

            s.dispatch();
            expect(sp0).to.have.been.calledTwice;
            expect(sp1).to.have.been.calledOnce;
            expect(s.handlers()).to.have.lengthOf(1);
        });

        it('does not dispatch when it returns true', function ()
        {
            const sp0 = spy();
            const sp1 = spy();
            const s = new Signal();

            s.add(sp0);
            s.once(sp1);
            s.filter(() => false);
            expect(s.handlers()).to.have.lengthOf(2);

            s.dispatch();
            expect(sp0).to.not.have.been.called;
            expect(sp1).to.not.have.been.called;
            expect(s.handlers()).to.have.lengthOf(2);

            s.dispatch();
            expect(sp0).to.not.have.been.called;
            expect(sp1).to.not.have.been.called;
            expect(s.handlers()).to.have.lengthOf(2);
        });

        it('gets the dispatch parameters', function ()
        {
            const sp0 = spy();
            const sp1 = spy();
            const s = new Signal<(b: boolean) => void>();

            s.add(sp0);
            s.once(sp1);
            s.filter((b) => b);
            expect(s.handlers()).to.have.lengthOf(2);

            s.dispatch(false);
            expect(sp0).to.not.have.been.called;
            expect(sp1).to.not.have.been.called;
            expect(s.handlers()).to.have.lengthOf(2);

            s.dispatch(true);
            expect(sp0).to.have.been.calledOnce;
            expect(sp1).to.have.been.calledOnce;
            expect(s.handlers()).to.have.lengthOf(1);

            s.dispatch(true);
            expect(sp0).to.have.been.calledTwice;
            expect(sp1).to.have.been.calledOnce;
            expect(s.handlers()).to.have.lengthOf(1);
        });
    });

    describe('#proxy', function ()
    {
        it('dispatches when proxied signal dispatches', function ()
        {
            const sp0 = spy();
            const sp1 = spy();

            const s0 = new Signal();
            const s1 = new Signal();

            s1.add(sp0);
            s1.once(sp1);
            s1.proxy(s0);

            s0.dispatch();
            expect(sp0).to.have.been.calledOnce;
            expect(sp1).to.have.been.calledOnce;

            s0.dispatch();
            expect(sp0).to.have.been.calledTwice;
            expect(sp1).to.have.been.calledOnce;
        });
    });
});
