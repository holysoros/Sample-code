// global variable definition
var xmlObj;                    // 加载的XML object
var zoneInfos = [];            // 存放所有Zone的全部信息
var curZone;                   // 存放当前激活的区域index
var motionEnabled;             // 是否enable了motion的标志位
var maxNumOfZones = 8;         // 最大区域数
var numOfZones    = 0;         // 记录当前区域数
var curMaxId      = 0;         // 记录区域中id的峰值，用于分配全局唯一的新id
var xmlBack       = 0;         // 初始页面的xml文件经JSON处理后的备份文件
var xmlFinal      = 0;         // 用户点击离开时的xml文件经JSON处理后的文件

$(document).ready(function() {
    showAjaxImage(); 
    // get xml
    $.get("/cgi-bin/motion.pl", parseXML, "xml");

  	// initial sliders
    $("#obj_size_slider").slider({ 
    	animate: 'normal',
    	slide: function(e, ui) {
    		$("#obj_size_value").text(ui.value);
    	},
    	change: function(e, ui) {
    		$("#obj_size_value").text(ui.value);
            var index = getIndexThrId(curZone);
            if (index >= 0) {
                zoneInfos[index]['objsize'] = eval('"' + ui.value + '"');
            }
    	}
    });
    $("#sens_slider").slider({ 
    	animate: 'normal',
    	slide: function(e, ui) {
    		$("#sens_value").text(ui.value);
    	},
    	change: function(e, ui) {
    		$("#sens_value").text(ui.value);
            var index = getIndexThrId(curZone);
            if (index >= 0) {
                zoneInfos[index]['sensitivity'] = eval('"' + ui.value + '"');
            }
    	}
    });
    
    // add event handlers
    $( "#live_video" ).click(function(e) {
        /* 判断click事件是否来源于某个zone */
        var targ;
        if (!e) {
            var e = window.event;
        }
        if (e.target) targ = e.target;
        else if (e.srcElement) targ = e.srcElement;
        if (targ.nodeType == 3)     // defeat Safari bug
            targ = targ.parentNode;

        /* 事件不来源于zone，则更新zone激活状态 */
        if ( targ.id.indexOf("zone") == -1 ) {
            curZone = -1;
            updateZoneActivation();
        }
    });
    $("#new_win").click(function() {
        /* 添加zoneInfos数组元素 */
        var newId = getAvailableId();
        zoneInfos[numOfZones] = {
            'id':       newId,
            'name':     'Window',
            'active':   'on',
            'left':     0,
            'top':      0,
            'width':    150,
            'height':   150,
            'sensitivity':     0,
            'objsize':  0
        };

        /* 以该数组元素为参数调用createZone函数 */
        createZone(zoneInfos[numOfZones]);

        /* 更新新建区域为“当前选择区域” */
        curZone = newId;
        updateZoneActivation();
    });
    $( "#save" ).click(saveZone);
    /*注册zone_name输入框的事件动作，更新相关信息*/
    $( "#zone_name" ).keyup( function() {
        var newName = $( "#zone_name" ).val();
        if ( validateValide(newName) ) {
            /* 隐藏错误提示信息 */
            $( "#err_msg_zone_name" ).hide();

            /* 修改zone及zone_list_item中的name */
            $( "#zone" + curZone + " h3" ).text(newName);
            $( "#zone_item" + curZone ).text(newName);

            /* 更新该区域内部数据结构 */
            var index = getIndexThrId(curZone);
            if (index >= 0)
                zoneInfos[index]['name'] = newName;
        }
        else {
            /* 显示错误提示信息 */
            $( "#err_msg_zone_name" ).show();

            /* 还原区域原名称 */
            /*var index = getIndexThrId(curZone);
            $( "#zone_name" ).val(zoneInfos[index]['name']);
            $( "#zone_name" ).select();*/
        }
    });

    /* 隐藏“区域设置”块 */
    $( "#zone_setting" ).hide();
    loadLanguages();
    $(window.parent.document).find("#language").change(changeLanguage);
    setTimeout("clearAjaxImage()",1000);
});

function parseXML(xmlDoc) {
    /* 根据XML中对应的值，设置motion detection switch checkbox */
    motionEnabled = $(xmlDoc).find("motion enable").text() == "on";
    $( "#motion_detection_switch" ).attr("checked", motionEnabled);

    /* 将XML信息转化为内部数据结构 */
    var zoneXMLNodes = $(xmlDoc).find("motion win");
    for (var i = 0; i < zoneXMLNodes.length && i < maxNumOfZones; i++) {
        var zoneXMLNode = zoneXMLNodes[i];
        zoneInfos[i] = {
            'id':       i,
            'name':     $(zoneXMLNode).find("name").text(),
            'active':   $(zoneXMLNode).find("active").text(),
            'left':     $(zoneXMLNode).find("left").text(),
            'top':      $(zoneXMLNode).find("top").text(),
            'width':    $(zoneXMLNode).find("width").text(),
            'height':   $(zoneXMLNode).find("height").text(),
            'sensitivity':     $(zoneXMLNode).find("sensitivity").text(),
            'objsize':  $(zoneXMLNode).find("objsize").text()
//            'color':    "getZoneColor()"
        };
    }

    /* 逐个调用createZone函数 */
    for (var i = 0; i < zoneXMLNodes.length && i < maxNumOfZones; i++) {
        createZone(zoneInfos[i]);
    }
    var mdInfos = {
        "enabled"   :   $( "#motion_detection_switch" ).attr('checked')? "on": "off",
        "zones"     :   zoneInfos
    };
    xmlBack = JSON.stringify(mdInfos);
}

/*!
 * \brief   根据给定参数信息创建区域.
 *
 * \param   zoneInfo 包含区域所有信息
 *
 * \return  NONE 
 */
function createZone(zoneInfo) {
    /* 在实时视频上添加“区域” */
    // 根据该区域的状态不同，添加不同的class
    var zoneAddClass = 'zone';
    if (zoneInfo['active'] == 'on')
        zoneAddClass += ' enabled_zone';
    else
        zoneAddClass += ' disabled_zone';

    var zoneHTMLFormat =            // 注册oncontextmenu事件以禁用右键菜单
                        "<div id='zone%d' class='%s' title='%d' oncontextmenu='return false;'" +    
                        "style='left: %dpx; top: %dpx; width: %dpx; height: %dpx; z-index: %d;'><h3>%s</h3></div>"
                        ;
    var zoneHTML = sprintf(zoneHTMLFormat, zoneInfo['id'], zoneAddClass, zoneInfo['id'], zoneInfo['left'], zoneInfo['top'], zoneInfo['width'], zoneInfo['height'], getMaxZIndex() + 1, zoneInfo['name']);
    $( "#motion_detection" ).append(zoneHTML);
	// initial zone
    $( "#zone" + zoneInfo['id'] ).resizable({
    	minHeight       :   10,
        minWidth        :   10,
    	autoHide        :   true,
    	containment     :   '#player',
    	handles         :   'all',
        stop            :   updateZoneRect
    });
    $( "#zone" + zoneInfo['id'] ).draggable({ 
    	containment     :   '#player', 
    	cursor          :   'crosshair', 
    	distance        :   5, 
    	scroll          :   false,
        stop            :   function(event, ui) {
            var id = this.title;
            var index = getIndexThrId(id);

            if (index >= 0) {
                zoneInfos[index]['left']     =   ui.position.left;
                zoneInfos[index]['top']      =   ui.position.top;
            }
        }
        /*stack:          ".zone",
        zIndex:         2700*/
    });
    // 注册区域event handler
    $( "#zone" + zoneInfo['id'] ).mousedown(function(e) {
        $( this ).css('zIndex', getMaxZIndex() + 1);
        curZone = this.title;
        updateZoneActivation();
    });

    
    /* 添加“区域列表项” */
    var zoneListFormat = 
                        "<tr id='zone_list_item%d' class='zone_list_item' title='%d'>\n" +
                        "	<td><input type='checkbox' id='zone_switch%d' title='%d'/></td>\n" +
                        "	<td><div id='zone_item%d' title='%d'>%s</div></td>\n" +
                        "	<td><img id='zone_del%d' class='zone_del' title='%d' src='/pic/blackX.png' style=''/></td>\n" +
                        "</tr>"
                        ;
    var zoneListHTML = sprintf(zoneListFormat, zoneInfo['id'], zoneInfo['id'], zoneInfo['id'], zoneInfo['id'], zoneInfo['id'], zoneInfo['id'], zoneInfo['name'], zoneInfo['id'], zoneInfo['id']);
    $( "#zone_list_table" ).append(zoneListHTML);
    $( "#zone_switch" + zoneInfo['id'] ).attr('checked', zoneInfo['active'] == "on");
    // 注册区域列表event handler
    $( "#zone_switch" + zoneInfo['id'] ).click(switchZoneEnabled);
    $( "#zone_item" + zoneInfo['id'] ).mousedown(function() {
        curZone = this.title;
        updateZoneActivation()
    });
    $( "#zone_del" + zoneInfo['id'] ).click(deleteZone);

    /* 更新“当前区域数”，如果等于最大区域数，则禁用New按钮 */
    numOfZones++;
    curMaxId++;
    if (numOfZones >= maxNumOfZones)
        $( "#new_win" ).attr('disabled', "true");
}

function deleteZone() {
    // 获取删除区域的id
    var id = this.title;

    /* 删除区域和区域列表项 */
    $( "#zone" + id ).remove();
    $( "#zone_list_item" + id ).remove();

    /* 更新“当前区域数” */
    numOfZones--;

    /* 删除区域是否为当前选择区域 */
    if (id == curZone) {
        curZone = -1;
        updateZoneActivation();
    }

    /* 完全删除“该删除区域”的内部数据结构 */
    var index = getIndexThrId(id);
    if (index >= 0)
        zoneInfos.splice(index, 1);
    if (numOfZones < maxNumOfZones)
        $( "#new_win" ).removeAttr('disabled');
}

/*!
 * \brief 通过区域的id获取该区域的内部数据结构的索引index.
 *
 * \param id
 *
 * \return  区域在zoneInfos数组中的索引值，若不存在则返回-1.
 */
function getIndexThrId(id) {
    for (var i = 0; i <= numOfZones && i <= maxNumOfZones; i++) {
        if (zoneInfos[i]['id'] == id){
            return i;
        }
    }
    return -1;
}

/*!
 * \brief   获取当前所有区域中最大z-index值.
 *
 * \return  当前所有区域的最大z-index值；若都没有z-index属性，则返回0.
 */
function getMaxZIndex() {
    return Math.max.apply(null, $.map( $( ".zone" ), function(obj) { return obj.style.zIndex; } ));     // obj为this
}

/*!
 * \brief   根据curZone全局变量，更新区域激活状态.
 *
 * \return  none
 */
function updateZoneActivation() {
    // 首先删除上一个选中区域的active class
    $( ".zone" ).removeClass('active_zone');
    $( ".zone_list_item" ).removeClass('active_zone_list');

    if (curZone >= 0) {  // 如果选择区域id大于0，则添加相应class及更新“区域设置”信息
        $( "#zone" + curZone ).addClass('active_zone');
        $( "#zone_list_item" + curZone ).addClass('active_zone_list');

        // 更新“区域信息设置”并显示
        var index = getIndexThrId(curZone);
        if (index >= 0) {
            $( "#zone_name" ).val(zoneInfos[index]['name']);
            $( "#obj_size_slider" ).slider('option', 'value', zoneInfos[index]['objsize']);
            $( "#sens_slider" ).slider('option', 'value', zoneInfos[index]['sensitivity']);
            $( "#zone_setting" ).show();
        }
    }
    else {      // 如果没选择任何区域，则隐藏“区域设置”块
        $( "#zone_setting" ).hide();
    }
}

function switchZoneEnabled() {
    // 获取该区域的id
    var id = this.title;

    // 为该区域设置正确的CSS Class
    var enabled = $( "#zone_switch" + id ).attr('checked');
    $( "#zone" + id ).removeClass(enabled? 'disabled_zone': 'enabled_zone');
    $( "#zone" + id ).addClass(enabled? 'enabled_zone': 'disabled_zone');

    // 修改该区域的内部数据结构信息
    var index = getIndexThrId(id);
    if (index >= 0)
        zoneInfos[index]['active'] = enabled? 'on': 'off';
}

function saveZone() {
    /* 隐藏保存状态信息 */
    $( "#save_succ" ).hide();
    $( "#save_fail" ).hide();

    /* 构建JSON数据结构 */
    var mdInfos = {
        "enabled"   :   $( "#motion_detection_switch" ).attr('checked')? "on": "off",
        "zones"     :   zoneInfos
    };
    var jsonStr = JSON.stringify(mdInfos);
    alert(jsonStr);
    /* 异步POST JSON到CGIf */
    var resXml = $.ajax({type:        "POST", 
                         url:         "/cgi-bin/motion.pl", 
                         data:        jsonStr, 
                         success:     function(){callback(resXml)},
                         error:       function(){pushError()}
                        });
    /* 异步POST JSON到CGIf */
    /*
    $.post("/cgi-bin/motion.pl", jsonStr, function(xmlDoc) {
            if ( $(xmlDoc).find("root status").text() == "0" ) {    // save successfully
                $( "#save_succ" ).show("fast", function() {
                    setTimeout(function() {
                        $( "#save_succ" ).fadeOut();
                    }, 3000);
                });
            }
            else {
                $( "#save_fail" ).show("fast", function() {
                    setTimeout(function() {
                        $( "#save_fail" ).fadeOut();
                    }, 3000);
                });
            }
        },
        "xml"       // 返回的数据为xml
    );
    */
}

function updateZoneRect(event, ui) {
    var id = this.title;
    var index = getIndexThrId(id);

    if (index >= 0) {
        zoneInfos[index]['left']     =   ui.position.left;
        zoneInfos[index]['top']      =   ui.position.top;
        zoneInfos[index]['width']    =   ui.size.width;
        zoneInfos[index]['height']   =   ui.size.height;
    }
}

function getAvailableId() {
    return curMaxId;
}

function validateValide(str) {
    if (str == "")
        return false;
    return true;
}
