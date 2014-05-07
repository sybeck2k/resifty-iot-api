Logger     = require("bunyan")
restify    = require("restify")
sinon      = require("sinon")
httpMocks  = require("node-mocks-http")
parseLinks = require('parse-links')

logger = new Logger(
  name: "restify-iot-test"
  streams: [
    stream: process.stderr
    level: "error"
  ]
  serializers:
    req: Logger.stdSerializers.req
)


describe "The Pagination middleware", ->
  mw = require("../../app/lib/middleware/write-header-pagination")
  next_spy = undefined
  res = undefined
  req = undefined
  spy_log_error = undefined
  isSecure_stub = undefined

  beforeEach ->
    next_spy  = sinon.spy()
    res = httpMocks.createResponse()
    req  = httpMocks.createRequest {
      method: 'GET',
      url: '/user/42',
      params: { id: 42 }
    }

    isSecure_stub = req.isSecure = sinon.stub()
    req.header = sinon.stub().withArgs('host').returns 'not_important.local'
    req.resource_base_url= '/url/123/'
    req.results_per_page=  5
    req.page_count= 15
    req.page= 5
    req.log= {}
    spy_log_error = req.log.error = sinon.spy()

  it "returns a next link when more pages are available", (done) ->
    isSecure_stub.returns true
    req.page= 1
    req.page_count= 5
    mw(req, res, next_spy)
    res.getHeader('Link').should.be.ok
    parsed_links = parseLinks res.getHeader('Link')
    parsed_links.should.have.properties(['last', 'first', 'next'])
    done()

  it "returns a prev link when not in the first page", (done) ->
    isSecure_stub.returns true
    req.page= 3
    req.page_count= 5
    mw(req, res, next_spy)
    res.getHeader('Link').should.be.ok
    parsed_links = parseLinks res.getHeader('Link')
    parsed_links.should.have.properties(['last', 'first', 'next', 'prev'])
    done()

  it "always returns the first and last link", (done) ->
    isSecure_stub.returns true
    mw(req, res, next_spy)
    res.getHeader('Link').should.be.ok
    parsed_links = parseLinks res.getHeader('Link')
    parsed_links.should.have.properties(['last', 'first'])
    done()

  it "returns https connection when the request is over SSL", (done) ->
    isSecure_stub.returns true
    mw(req, res, next_spy)
    parsed_links = parseLinks res.getHeader('Link')
    parsed_links.first.should.match(/^https:\/\//)
    parsed_links.last.should.match(/^https:\/\//)
    done()

  it "returns http connection when the request is not over SSL", (done) ->
    isSecure_stub.returns false
    mw(req, res, next_spy)
    parsed_links = parseLinks res.getHeader('Link')
    parsed_links.first.should.match(/^http:\/\//)
    parsed_links.last.should.match(/^http:\/\//)
    done()

  it "returns an internal error when the request parameter resource_base_url is missing", (done) ->
    delete req.resource_base_url
    mw(req, res, next_spy)
    next_spy.called.should.be.true
    spy_log_error.called.should.be.true
    spyCall = next_spy.getCall(0).args[0]
    spyCall.statusCode.should.equal(500)
    done()

  it "returns an internal error when the request parameter page_count is missing", (done) ->
    delete req.page_count
    mw(req, res, next_spy)
    next_spy.called.should.be.true
    spy_log_error.called.should.be.true
    spyCall = next_spy.getCall(0).args[0]
    spyCall.statusCode.should.equal(500)
    done()
      
  it "returns an internal error when the request parameter page is missing", (done) ->
    delete req.page
    mw(req, res, next_spy)
    next_spy.called.should.be.true
    spy_log_error.called.should.be.true
    spyCall = next_spy.getCall(0).args[0]
    spyCall.statusCode.should.equal(500)
    done()
      
  it "returns an internal error when the request parameter results_per_page is missing", (done) ->
    delete req.results_per_page
    mw(req, res, next_spy)
    next_spy.called.should.be.true
    spy_log_error.called.should.be.true
    spyCall = next_spy.getCall(0).args[0]
    spyCall.statusCode.should.equal(500)
    done()

