import React from 'react';
import {clearFunc,calcColorBallNewPosition,calcCodeStrArrPlusMinus,checkDidAllunSub,_fetchData,evalFunctionInReact,getSubPositionFromCode,delSubscribe,addSubscribe,changeLine} from '../tools'
import {SectionWrap} from '../Widget'
import Marble from '../Marble'
import Result from '../Result'
import Rx from 'rxjs/Rx'
import {fromJS,is,toJS} from 'immutable';




export default class OperatorsCoreContainer extends React.Component{
    constructor(){
        super()
        this.initSetData=this.initSetData.bind(this)
        this.fetchDataSetState=this.fetchDataSetState.bind(this)
        this.testStart=this.testStart.bind(this)
        this.clearStart=this.clearStart.bind(this)
        this.testStop=this.testStop.bind(this)
        this.allUnsubscribe=this.allUnsubscribe.bind(this)
        this.marbleCheckChange=this.marbleCheckChange.bind(this)
        this.resultCheckChange=this.resultCheckChange.bind(this)
        this.showRxjsInResult=this.showRxjsInResult.bind(this)
        this.showRxjsInMarble=this.showRxjsInMarble.bind(this)
        this.refreshResultMarble=this.refreshResultMarble.bind(this)
        this.refreshStartStopButton=this.refreshStartStopButton.bind(this)
        this.setShowInWhereArr=this.setShowInWhereArr.bind(this)
        this.setMarbleLine=this.setMarbleLine.bind(this)
        this.NEC=this.NEC.bind(this)
        this.prevCodeArr=[]
        /*
        此处 this.unSubMarble ; this.unSubResult
        内部是Subscriber对象
        immutable对Subscriber不会用，总是不能在shouldComponentUpdate正确判断是否更新
        所以这里使用了this 而没有放在state里面
        */
        this.unSubMarble={}
        this.unSubResult={}
        this.newMarbleArr=[]
        this.state={
            showMarble:true,
            showResult:true,
            marbleText:'', line:0,
            isFetching:true,
            resultValue:false,
            marbleArr:false,
            showStartButton:true,
            curOperatorName:'',
            fetchDataSetState:this.fetchDataSetState
        }
    }


    initSetData(data){
            const {title,name,caption,code,marbleText}=data;
            const codeObj=calcCodeStrArrPlusMinus(code,this.prevCodeArr),
                codeStr=codeObj.str,
                minus=codeObj.minus,
                plus=codeObj.plus;
            this.prevCodeArr=codeObj.arr;
            this.clearStart()
            this.unSubMarble={}
            this.unSubResult={}
            const showInWhereArr=getSubPositionFromCode(code)
            const line=showInWhereArr.length;
            this.setState({
                showInWhereArr,
                code,
                isFetching:false,
                basicData:{ title, name, caption, minus, plus,code:codeStr},
                line, marbleText
            })
    }

    fetchDataSetState(operatorName){
        this.fetch$=Rx.Observable.fromPromise(_fetchData(operatorName))
            .subscribe(data=>this.initSetData(data))
    }

    setShowInWhereArr(i,key){
        //console.log(i,key)
        const {showInWhereArr,code,} = this.state
        const currentShowStatus=showInWhereArr[i][key]
        let newShowInWhereArr=fromJS(showInWhereArr).setIn([i,key],!currentShowStatus).toJS()
        const needChange=showInWhereArr[i]
        let newCode=currentShowStatus
            ?
            delSubscribe(code,needChange.name,needChange.line,key)
            :
            addSubscribe(code,needChange.name,needChange.line,key)
        this.setState(prevState=>({
            showInWhereArr:newShowInWhereArr,
            code:newCode
        }))
    }

    setMarbleLine(i,newLine){
        let newShowInWhereArr=fromJS(this.state.showInWhereArr).setIn([i,'line'],newLine).toJS()
        const needChange=this.state.showInWhereArr[i]
        let newCode=changeLine(this.state.code,needChange.name,newLine)

        this.setState(prevState=>({
            showInWhereArr:newShowInWhereArr,
            code:newCode
        }))
    }
    componentWillUnmount(){
        this.fetch$.unsubscribe()
    }
    shouldComponentUpdate(nextProps,nextState){
            //console.log(this.props,nextProps)
        //console.log(this.state,nextState)
        return !is(fromJS(this.props),fromJS(nextProps))
             || !is(fromJS(this.state),fromJS(nextState))
    }

    /**
     * 新API 可以代替以下componentDidMount 和 componentWillReceiveProps
     * @param nextProps
     * @param prevState
     * @returns {*}
     */
    static getDerivedStateFromProps(nextProps,prevState){
        const curOperatorName=prevState.curOperatorName,
            nextOperatorName=nextProps.match.params.section;
        if(curOperatorName!==nextOperatorName){
            prevState.fetchDataSetState(nextOperatorName)
            return {
                isFetching:true,
                showStartButton:true,
                curOperatorName:nextOperatorName
            }
        }
        return null;
    }

    /**
     * 清空result界面 &  清空marble界面
     * 清空小球小球arr
     */
    refreshResultMarble(status){
        this.newMarbleArr=[];
        let _marbleArr,_resultValue
        switch(status){
            case 'clear':
                _marbleArr=false;
                _resultValue=false;
                break;
            case 'start':
                _marbleArr=this.newMarbleArr;
                _resultValue='';
                break;
            default:
                throw new Error('参数status错误 应该为clear或者start')
        }

        this.setState({
            marbleArr:_marbleArr,
            resultValue:_resultValue
        })
    }

    /**
     * result checkbox事件
     */
    resultCheckChange(){
        this.setState(prevState=>({
            showResult:!prevState.showResult
        }))
    }
    /**
     * marble checkbox事件
     */
    marbleCheckChange(){
        this.setState(prevState=>({
            showMarble:!prevState.showMarble
        }))
    }

    /**
     * Subscription订阅参数
     * N:next:()=>{}
     * E:error:()=>{}
     * C:complete:()=>{}
     */
    NEC(showInWhere, whichLine){
        return {
            next: (v)=> {showInWhere(v, whichLine)},
            error: ()=> {showInWhere('error', whichLine)},
            complete: ()=> {showInWhere('complete', whichLine)}
        }
    }
    /**
     * 开始按钮方法
     * 清楚unsubscribe-》执行函数-》清空页面（放在最后可以刷新状态）
     * @param e
     */
    testStart(e){
        if(e){
            e.stopPropagation()
            e.nativeEvent.stopImmediatePropagation();
        }
        if(this.state.code==="无数据"){alert('数据获取失败！请选择正确的操作符');return;}
        this.timeStamp=new Date().getTime()

        this.allUnsubscribe()
        this.refreshResultMarble('start')

        //为了避免快速执行时 result的value出现又被以下清空，放到执行上面
        this.setState(prevState=>({
            showStartButton:checkDidAllunSub(this.unSubMarble,this.unSubResult),
        }))


        //Function(this.state.code).call(this)
        Function(['NEC','resSub','marSub','showInRes','showInMar'],this.state.code)
            .apply(this,[this.NEC,this.unSubResult,this.unSubMarble,this.showRxjsInResult,this.showRxjsInMarble])
        //this.state.func.apply(this,[this.NEC,this.unSubResult,this.unSubMarble,this.showRxjsInResult,this.showRxjsInMarble])
        //this.state.func.call(this)
        //this.state.func.call(this,this.showRxjsInResult,this.showRxjsInMarble)

        //TODO:需要修正 强制刷新result
        this.resultRefreshTimeStamp=new Date().getTime()
    }

    refreshStartStopButton(){
        this.setState({
            showStartButton:checkDidAllunSub(this.unSubMarble,this.unSubResult)
        })
    }

    testStop(e){
        if(e){
            e.stopPropagation()
            e.nativeEvent.stopImmediatePropagation();
        }
        this.allUnsubscribe()
        this.refreshStartStopButton()
        //TODO:需要修正 强制刷新marble,result
        this.marbleRefreshTimeStamp=new Date().getTime()
        this.resultRefreshTimeStamp=new Date().getTime()
    }

    /**
     * 全部unsubscribe，但不更新页面
     */
    allUnsubscribe(){
        clearFunc(this.unSubMarble);
        clearFunc(this.unSubResult);
    }

    /**
     * 清楚按钮
     * unsubscribe-》清空界面
     * @param e
     */
    clearStart(e){
        if(e){
            e.stopPropagation()
            e.nativeEvent.stopImmediatePropagation();
        }
        this.allUnsubscribe()
        this.refreshResultMarble('clear')

    }
    /**
     * subscribe in marble方法
     * @param v
     * @param whichLine
     */
    showRxjsInMarble(v,whichLine){
        const {line}=this.state;
        let curTimeStamp=new Date().getTime();
        let timeGap=curTimeStamp-this.timeStamp
        let marbleBallObj=calcColorBallNewPosition(line,whichLine,v,timeGap);
        this.newMarbleArr=this.newMarbleArr.concat(marbleBallObj);
        this.setState({marbleArr:this.newMarbleArr})
    }
    /**
     * subscribe in result方法
     * @param v
     */
    showRxjsInResult(v){
        this.setState(prevState=>({
            resultValue:`${prevState.resultValue || ''}value:${v}&nbsp;&nbsp;stringify:${JSON.stringify(v)}<br>`
        }))
    }
    render(){
        console.log('OperatorsCoreContainer')
        const {isFetching,basicData,showMarble,showResult,showStartButton,showInWhereArr,
            marbleArr,line,marbleText,resultValue}=this.state
        return(
            <React.Fragment>
                <SectionWrap
                    isFetching={isFetching}
                    basicData={basicData}
                    showInWhereArr={showInWhereArr}
                    setShowInWhereArr={this.setShowInWhereArr}
                    setMarbleLine={this.setMarbleLine}
                    resultCheckChange={this.resultCheckChange}
                    marbleCheckChange={this.marbleCheckChange}
                    showMarble={showMarble}
                    showResult={showResult}
                    showStartButton={showStartButton}
                    testStop={this.testStop}
                    clearStart={this.clearStart}
                    testStart={this.testStart} />
                <div>
                    {showMarble?
                        <Marble
                            timeStamp={this.marbleRefreshTimeStamp}
                            refreshStartStopButton={this.refreshStartStopButton}
                            unSubMarble={this.unSubMarble}
                            marbleArr={marbleArr}
                            line={line}
                            marbleText={marbleText} />
                        :null}
                    {showResult?
                        <Result
                            resultRefreshTimeStamp={this.resultRefreshTimeStamp}
                            refreshStartStopButton={this.refreshStartStopButton}
                            unSubResult={this.unSubResult}
                            value={resultValue}/>:null}
                </div>
            </React.Fragment>
        )
    }
}

