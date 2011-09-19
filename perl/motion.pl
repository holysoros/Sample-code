#!/usr/bin/perl
use strict;
use warnings;

=begin comment
File        motion.pl
Brief       
Author      LiJunjie, holysoros@gmail.com
Version     0.00
Date        11-06-16 16:09:25
=cut

use Data::Dumper;
use JSON;
use XML::Writer;
#use lib qw( /home/soros/www/cgi-bin/ );
#use HolyError;

my $CONFIG_FILE = "../etc/conf.d/c0/vencvideoin_conf.xml";
my $TMP_FILE_PREFIX = "../etc/conf.d/c0/vencvideoin_conf.xml.tmp.";
my $REQUEST_METHOD = $ENV{ "REQUEST_METHOD" };
my $err_status = 0;

my $xml_tag_ref = [
    { status    =>  "active" },
    { name      =>  "name" },
    { left      =>  "left" },
    { top       =>  "top" },
    { width     =>  "width" },
    { height    =>  "height" },
    { sens      =>  "sensitivity" },
    { objSize   =>  "objsize" }
];

print "Content-type: text/xml\n";
print "Cache-control: no-cache\n";
print "\n";

if ( $REQUEST_METHOD eq "GET" ) {
    open my $config, '<', $CONFIG_FILE;
    print <$config>;
}
elsif ( $REQUEST_METHOD eq "POST" ) {
    # 从STDIN读取数据
    my $md_infos_JSON;
    read STDIN, $md_infos_JSON, $ENV{ 'CONTENT_LENGTH' } or die "Could not read from STDIN:$!";
#    undef $/;
#    my $md_infos_JSON = <>;

    # 将数据从JSON形式转化为Perl内部数据
    my $md_infos = decode_json $md_infos_JSON;

    #---------------------------------------------------------------------------
    #  将数据从Perl内部数据形式转化为XML字符串
    #---------------------------------------------------------------------------
    # 初始化XML::Writer
    my $xml_str;
    my $writer = new XML::Writer(
        OUTPUT          =>  \$xml_str,  # 一个IO::Handle实体或string引用,不指定此项会输出至stdout
        UNSAFE          =>  0,          # 是否跳过most well-formedness error checking
        DATA_MODE       =>  1,          # 是否在element周围自动插入新行
        DATA_INDENT     =>  4,          # 指定缩进空格数
        ENCODING        =>  'utf-8',    # 指定XML的字符编码格式及XML声明；可用'utf-8'/'us-ascii'
    );

    # 开始构建XML字符串
    $writer->startTag( "motion" );      # 总的motion tag
    $writer->dataElement( "enable", $md_infos->{ "enabled" } );     # enabled tag
    my $wins_ref = $md_infos->{ "zones" };
    for ( my $i = 0; $i < @{ $wins_ref }; $i++ ) {      # 遍历每一个zone
        $writer->startTag( "win", "id" => $i );         # 为每个zone创建win tag, 属性id为该zone在数组中的索引值
        my $win_ref = $wins_ref->[$i];
        foreach my $tag ( keys %{ $win_ref } ) {        # 为zone中每一项信息创建相应的tag，除了id信息
            next if $tag eq "id";
            $writer->dataElement( $tag, $win_ref->{ $tag } );
        }
        $writer->endTag( "win" );                       # 关闭win tag
    }
    $writer->endTag( "motion" );                        # 关闭motion tag
    # 对XML字符串每一行缩进2个制表符
    $xml_str =~ s/^(.*)/        $1/gm;

    #---------------------------------------------------------------------------
    #  用新生成的XML字符串替换XML文件中的相应内容
    #---------------------------------------------------------------------------
    # 读取原配置文件内容
    undef $/;
    open my $old_xml_fh, '<', $CONFIG_FILE or die "Could not open $CONFIG_FILE:$!"; 
    defined( my $old_conf = <$old_xml_fh> ) or die "Read from $CONFIG_FILE error:$!";
    close $old_xml_fh or die "Close failed:$!";
    # 替换原配置文件中motion部分为新生成的XML字符串
    $old_conf =~ s!(\t| )*<motion>.*?</motion>!$xml_str!s;
    # 将新配置文件内容写入到临时文件中
    open my $tmp_config_fh, '>', $TMP_FILE_PREFIX.$$ or $err_status = 1; #打开此文件会产生错误?
    print { $tmp_config_fh } $old_conf;
    close $tmp_config_fh or "Close error:$!";

    # 用临时文件覆盖原配置文件
    rename $TMP_FILE_PREFIX.$$, $CONFIG_FILE or die "rename error:$!";

    print "<?xml version=\"1.0\" encoding=\"UTF-8\" ?>\n";
    #print "<?xml version=\"1.0\" standalone=\"yes\" ?>\n";
    print "<root>\n";
    print "<success>$err_status</success>\n";
    print "</root>";
}
