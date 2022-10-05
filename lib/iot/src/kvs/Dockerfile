FROM 546150905175.dkr.ecr.us-west-2.amazonaws.com/kinesis-video-producer-sdk-cpp-amazon-linux:latest
# FROM 053319678981.dkr.ecr.eu-west-1.amazonaws.com/kinesis-video-producer-sdk-cpp-amazon-linux:latest
# FROM 053319678981.dkr.ecr.eu-west-1.amazonaws.com/kinesis-video-producer-sdk-cpp-amazon-linux
# FROM kinesis-video-producer-sdk-cpp-raspberry-pi:latest

ENV LD_LIBRARY_PATH=/opt/awssdk/amazon-kinesis-video-streams-producer-sdk-cpp/kinesis-video-native-build/downloads/local/lib:$LD_LIBRARY_PATH
ENV PATH=/opt/awssdk/amazon-kinesis-video-streams-producer-sdk-cpp/kinesis-video-native-build/downloads/local/bin:$PATH
ENV GST_PLUGIN_PATH=/opt/awssdk/amazon-kinesis-video-streams-producer-sdk-cpp/kinesis-video-native-build/downloads/local/lib:$GST_PLUGIN_PATH

ENV ISENGARD_PRODUCTION_ACCOUNT=false
ENV AWS_ACCESS_KEY_ID=ASIAQY2QZXQCSX3NMJKL
ENV AWS_SECRET_ACCESS_KEY=8PZgVEZqLrZ0QOjWe+hY7e+MPGadVecU/SMvClml
ENV AWS_SESSION_TOKEN=IQoJb3JpZ2luX2VjEBsaCXVzLWVhc3QtMSJHMEUCIC+ACjH5keGmGv35HL4UvquKLyAnL6k/CCKfVAZJqlvdAiEAqfyMx07PZgSzkBtmZlwfbsUSCd4j+s4FNI4MP6eXUx4qqAII1P//////////ARACGgwwNTMzMTk2Nzg5ODEiDDz+PyCtVD+4g3POKCr8AXCLrm8h0m013cAW6z5uN5LNvdLtOEKyPWJMCAmHGI45ETqYCVnHm1y8uFAgqQrMWJaRMEahzimXIscPwL3r5Wl7nITqRqC3KVZPlZi6//2qPJPnm0wkzEYEijsX0VDGDgnHQzgQkxlzVOIuErtVNDatYeDq1HWYiyEClbfAU9426f/3nCIXnBCdIlV9XwYEFZtbeqFmJXySgecUWD/4+8kNLi5IklfHaanlVfgWzo/ovwbAHIYLhBoV0llVsw3aTS50VXoqwZ+qCS0P+5AdsNFkskuBpBC6/JGN++8B6D8A97vvzY3kd9IDd3S0okc6keV0z4Snpfa/Rkr+EzDmtvWZBjqdAY8qu1yay0UJ2DbUwziiuaM4/WDAmJwf6/3Fb++GoF36qFfQU6pIxkkv6dHn/on9YAnS/kb+JJyDvZ4x4kRuPCdskQgZPAZDh5+yeDQBT35e7a9gupkjg5WSLA+LYp6Ch1s+fNyatMFgCAt94z/P0/tl+ZlGCU4bZqCkaE5ENkRuV8Zf0t/axrLjSZQSB58itUFrE3Ziehc5fM2Q0gY=
ENV AWS_DEFAULT_REGION=eu-west-1

#CMD gst-launch-1.0 v4l2src do-timestamp=TRUE device=/dev/video0 ! videoconvert ! video/x-raw,format=I420,width=640,height=480,framerate=30/1 ! x264enc ! h264parse ! video/x-h264,stream-format=avc,alignment=au,width=640,height=480,framerate=30/1,profile=baseline ! kvssink stream-name='CameraCameraStream8A6F06B3-gnFPhH2pekZK' aws-region='eu-west-1'
CMD gst-launch-1.0 v4l2src do-timestamp=TRUE device=/dev/video0 ! videoconvert ! video/x-raw,format=I420,width=640,height=480,framerate=30/1 ! x264enc ! h264parse ! video/x-h264,stream-format=avc,alignment=au,width=640,height=480,framerate=30/1,profile=baseline ! kvssink stream-name='CameraCameraStream8A6F06B3-gnFPhH2pekZK'
